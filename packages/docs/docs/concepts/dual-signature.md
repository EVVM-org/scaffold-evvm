---
sidebar_position: 3
title: Dual signatures
---

# Dual signatures

Every EVVM **service operation** — Staking, NameService, P2PSwap, and
any custom service that extends `EvvmService` — requires two
signatures from the user:

1. **Action signature** — proves the user authorized the specific
   action (e.g. *"register username 'alice'"*).
2. **Pay signature** — proves the user authorized the EVVM-internal
   fee transfer that funds the action.

This is the **dual signature pattern**. It's the most important pattern
to internalize when working with EVVM, because every service call —
including the ones you write yourself — uses it.

> Direct `Core.pay()` and `Core.dispersePay()` calls (the
> `/evvm/payments` page) are *not* service operations and need only a
> single signature. Same goes for `Treasury.deposit()` and
> `Treasury.withdraw()`, which are direct caller balance ops with no
> signature at all.

## Why two signatures and not one?

The fee and the action are two distinct on-chain effects:

- The **action** runs against the service contract (Staking,
  NameService, …). Its signature is verified by the service via
  `Core.validateAndConsumeNonce(...)` with the per-operation
  `hashPayload`.
- The **fee** is an EVVM-internal `pay()` that moves tokens from the
  user to the service contract. Its signature is verified the same
  way, but with `hashPayload` set to the `pay()` operation hash.

By signing them separately, the protocol can:

- Enforce both atomically on-chain (if the pay fails, the action
  reverts; if the action fails, the pay rolls back).
- Pay the Fisher (the relayer that submits the tx) out of the same
  pay via the `priorityFeePay` field.
- Decouple the two nonces, so a user can authorize many actions in
  parallel as long as they manage nonces correctly.

## What the frontend hides for you

In the scaffold-evvm UI, you click "Sign and submit" once. Under the
hood:

```typescript
const { paySignature, actionSignature } = await signatureBuilder.signPublicStaking(
  user, isStaking, amountStaked,
  nonceAction, nonceEvvm,
  serviceAddress, mateTokenAddress, totalCost, priorityFee,
  isAsyncExecAction, isAsyncExecEvvm,
);

await stakingService.publicStaking({
  /* business args + canonical EVVM plumbing */
  signature: actionSignature,
  signaturePay: paySignature,
});
```

Two `eth_sign` calls happen behind that single click. Modern wallets
(MetaMask, Rabby) batch them so the user sees one or two prompts
depending on their settings.

## How services consume both signatures

Looking at a NameService function (truncated for clarity):

```solidity
function registrationUsername(
    address user,
    string  memory username,
    uint256 lockNumber,
    address senderExecutor,
    address originExecutor,
    uint256 nonce,
    bytes   memory signature,        // action signature
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay      // pay signature
) external {
    // 1. Verify the action signature against the per-op hash:
    bytes32 actionHash = keccak256(abi.encode("registrationUsername", username, lockNumber));
    Core.validateAndConsumeNonce(
        user, senderExecutor, actionHash, originExecutor, nonce, true, signature
    );

    // 2. Pull the fee through Core.pay using the pay signature:
    requestPay(
        user, MATE, registrationFee, priorityFeePay,
        originExecutor, noncePay, true, signaturePay
    );

    // 3. Do the actual action.
    _grantUsername(user, username);
}
```

Both `validateAndConsumeNonce` calls consume their nonces atomically.
If either fails, the whole tx reverts.

## Building services that use dual signatures

Inherit from `EvvmService`. Your function signature looks like:

```solidity
function buyTicket(
    /* business arguments */
    uint256 eventId,

    /* canonical EVVM plumbing */
    address senderExecutor,
    address originExecutor,
    uint256 nonce,
    bytes   memory signature,

    /* canonical EVVM pay plumbing */
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay
) external;
```

Inside the function:

1. Build the action hash:
   `keccak256(abi.encode("buyTicket", eventId))`
2. Call `Core.validateAndConsumeNonce(user, senderExecutor, actionHash, originExecutor, nonce, isAsyncExec, signature)` — typically with `isAsyncExec = true` for services.
3. Call `requestPay(user, token, amount, priorityFeePay, originExecutor, noncePay, isAsyncExecPay, signaturePay)` — `requestPay` is the helper inherited from `EvvmService` that funnels into `Core.pay`.
4. Run the action.

Scaffold-evvm's auto-UI for custom services builds both signatures
automatically when your service inherits from `EvvmService` and your
manifest declares the action's payload schema. See **[Custom Services /
Manifest](../custom-services/manifest.md)**.

## Async pay constraint for some services

A few services force `isAsyncExec = true` on the **pay** side
regardless of what you pass for the action:

- **Presale staking** and **public staking** always submit the EVVM-pay
  with `isAsyncExec = true` (enforced inside
  `Staking.stakingBaseProcess()`).
- **Golden staking** is the exception — it uses sync nonce on the pay
  too, since only the golden fisher calls it.

Custom services can pick either, but doing async on both sides is the
convention because it lets the user submit many parallel actions
without waiting for sync nonce ordering.
