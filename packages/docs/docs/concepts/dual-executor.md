---
sidebar_position: 4
title: Dual executor
---

# Dual executor

EVVM signatures bind to **two** executor addresses, not one. This page
explains why, and what to put in each field when you sign.

## The two roles

| Field | What it is | Solidity equivalent |
|-------|------------|---------------------|
| `senderExecutor` | The address that delivers the call to Core's `validateAndConsumeNonce` — i.e. the contract or EOA whose `msg.sender` Core sees | `msg.sender` of the Core function |
| `originExecutor` | The EOA that started the whole transaction chain | `tx.origin` |

For a **direct EVVM pay** (calling `Core.pay()` from your wallet), both
are the same: your EOA.

For a **service call** (e.g. calling `Staking.publicStaking()` from
your wallet, which then calls into Core), they differ:

- `senderExecutor` = the **service contract address** (because that's
  what Core sees as `msg.sender`).
- `originExecutor` = your EOA (the `tx.origin`).

## Why bind to both?

Without dual binding, a malicious relayer could replay your signature
through *its own* contract — same `tx.origin`, different `msg.sender` —
and re-route the fee to itself. Including both addresses in the signed
envelope makes that impossible.

It also enables a subtler property: contracts that pay on behalf of
users (via `Core.caPay`) can prove the upstream initiator is the user,
not a random EOA the contract chose. This is what makes the
multi-service composition story work safely — Service A can trigger a
pay-from-user-to-Service-B, and Core can verify the user actually
signed for it.

## What to put in each field

**Calling Core directly** (e.g. from `/evvm/payments`):

```typescript
{
  senderExecutor: connectedWalletAddress,
  originExecutor: connectedWalletAddress,
}
```

**Calling a service** (e.g. from `/evvm/staking`):

```typescript
{
  senderExecutor: serviceContractAddress,   // e.g. STAKING_ADDRESS
  originExecutor: connectedWalletAddress,
}
```

The scaffold-evvm UI pre-fills these correctly — you only override
them when you're testing executor-spoofing edge cases.

## Where this surfaces in scaffold-evvm

- **Signature builders** in `packages/nextjs/src/lib/evvmSignatures.ts`
  accept both fields and include them in every payload.
- **EVVMScan transaction details** breaks out `senderExecutor` and
  `originExecutor` as separate rows so you can verify what was signed
  against what the contract saw.
- **Custom services**: when your service inherits from `EvvmService`,
  the base contract enforces the binding for you — your service code
  just forwards both values from calldata into
  `Core.validateAndConsumeNonce(...)` and the `requestPay(...)` helper.

## Combined with nonces

The unified envelope already includes `(senderExecutor, originExecutor,
nonce, isAsyncExec)`. So the same nonce + the same `originExecutor`
*through a different `senderExecutor`* produces a different signature
hash. That means each combination of (user, sender route, nonce) is a
unique "signature slot" — a relayer can't bypass nonce protection by
varying the route.

See **[Nonces](./nonces.md)** for sync vs async semantics and how
`reserveAsyncNonce` lets a service pre-allocate a nonce slot for a
specific sender route.
