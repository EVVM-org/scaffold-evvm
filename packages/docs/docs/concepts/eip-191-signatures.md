---
sidebar_position: 2
title: EIP-191 signatures
---

# EIP-191 signatures

EVVM uses [EIP-191](https://eips.ethereum.org/EIPS/eip-191) "personal
sign" signatures for every meta-transaction. This page covers the
exact payload format Core verifies and how it relates to the
operation-specific data your service signs.

## Why EIP-191 (and not EIP-712)?

EIP-712 has a typed-data domain that ties the signature to a specific
chain/contract/version. EIP-191 is simpler — just a UTF-8 prefix:

```
"\x19Ethereum Signed Message:\n" + length(payload) + payload
```

Every wallet supports EIP-191 (`personal_sign`) without extra plumbing,
which makes EVVM signatures easy to produce from any tooling. The
protocol re-introduces the missing context (chain, executor, nonce)
*inside* the payload itself.

## The unified payload

Every EVVM signature — `pay`, `stake`, `register`, `makeOrder`, your
custom service — recovers as a personal-signed message of:

```solidity
keccak256(abi.encode(
    evvmId,         // uint256 — this EVVM instance's ID, prevents cross-deploy replay
    senderExecutor, // address — msg.sender of the Core call
    hashPayload,    // bytes32 — operation-specific hash (see below)
    originExecutor, // address — tx.origin (the EOA that started everything)
    nonce,          // uint256
    isAsyncExec     // bool    — true for async nonce, false for sync
))
```

Only `hashPayload` changes per operation. Everything else is the
canonical envelope. This is what `Core.validateAndConsumeNonce`
reconstructs and recovers internally:

```solidity
validateAndConsumeNonce(
    address user,
    address senderExecutor,
    bytes32 hashPayload,
    address originExecutor,
    uint256 nonce,
    bool    isAsyncExec,
    bytes   calldata signature
);
```

If the recovered signer doesn't match `user`, the call reverts. If the
nonce is invalid (sync nonce out of order, or async nonce already
consumed), it reverts. If the optional UserValidator says the user
isn't allowed, it reverts.

## What goes into `hashPayload`

Per-operation hash builders live in
`packages/foundry/testnet-contracts/library/utils/signature/`. They all
follow the same shape:

```solidity
keccak256(abi.encode("operationName", arg1, arg2, ...))
```

The first argument is **always** the operation name as a string literal.
This prevents cross-operation replay (a `pay` signature can't be
re-routed as a `dispatchOrder`).

Examples from the bundled contracts:

| Function | Hash |
|----------|------|
| Core `pay` | `hashDataForPay(...)` — encodes recipients, token, amount, priorityFee |
| Staking `publicStaking` | `hashDataForPublicStake(isStaking, amountOfStaking)` → `keccak256(abi.encode("publicStaking", isStaking, amountOfStaking))` |
| NameService `registrationUsername` | `hashDataForRegistrationUsername(username, lockNumber)` → `keccak256(abi.encode("registrationUsername", username, lockNumber))` |
| NameService `makeOffer` | `keccak256(abi.encode("makeOffer", username, amount, expirationDate))` |
| P2PSwap `makeOrder` | `keccak256(abi.encode("makeOrder", tokenA, tokenB, amountA, amountB))` |
| P2PSwap `dispatchOrder` | `keccak256(abi.encode("dispatchOrder", tokenA, tokenB, orderId))` *(reused by both fillProportionalFee and fillFixedFee)* |

Note what's *not* in these inner hashes: the executor addresses, the
nonce, the `isAsyncExec` flag. Those are added by the unified envelope
above, so the action hash is purely about the action's intent.

## Action signatures vs pay signatures

Service operations (staking, NameService, P2PSwap, EvvmService-based
custom services) require **two** signatures:

- **Action signature** — over the unified envelope with `hashPayload`
  set to the per-operation hash from above.
- **Pay signature** — over the unified envelope with `hashPayload` set
  to the `Core.pay()` operation hash, transferring the fee from the
  user to the service contract.

Both are signed by the same EOA. Both must succeed for the operation
to land. See **[Dual signatures](./dual-signature.md)**.

## Verification on-chain (sketch)

```solidity
bytes32 envelope = keccak256(abi.encode(
    evvmId, senderExecutor, hashPayload, originExecutor, nonce, isAsyncExec
));
bytes32 ethSigned = keccak256(abi.encodePacked(
    "\x19Ethereum Signed Message:\n32", envelope
));
address signer = ecrecover(ethSigned, v, r, s);
require(signer == user, "Bad signature");
```

The shared helper for this lives in `library/utils/signature/SignatureRecover.sol`.

## Producing signatures from the frontend

Scaffold-evvm wraps `@evvm/viem-signature-library` in
`packages/nextjs/src/lib/evvmSignatures.ts`. You don't construct the
envelope yourself — you call the per-operation builder, which:

1. Computes the `hashPayload` for the operation.
2. Builds the unified envelope.
3. Asks the wallet to `personal_sign` it.
4. Returns the signature (and, for service ops, both signatures).

```typescript
const { paySignature, actionSignature } = await signatureBuilder.signPublicStaking(
  user, isStaking, amount,
  nonceAction, nonceEvvm,
  serviceAddress, mateTokenAddress, totalCost, priorityFee,
  isAsyncExecAction, isAsyncExecEvvm,
);
```
