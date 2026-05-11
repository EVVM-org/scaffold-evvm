---
sidebar_position: 1
title: Meta-transactions
---

# Meta-transactions

EVVM is built around **gasless meta-transactions**: the user signs an
intention off-chain; a relayer (called a "Fisher" in EVVM terminology)
submits the signed intention on-chain and pays the ETH gas. The user's
ETH balance never moves.

## Why this matters

Traditional Ethereum requires every user to:

1. Hold ETH for gas.
2. Pay gas in ETH for every state change.

EVVM removes both frictions by splitting *signing* from *submitting*:

```
User                       Fisher                       Chain
 │                            │                          │
 │  sign(intent) ─ off-chain  │                          │
 │ ──────────────────────────▶│                          │
 │                            │  submit(signed intent)   │
 │                            │ ────────────────────────▶│
 │                            │  pays gas in ETH         │
 │                            │                          │
 │                            │  paid in EVVM tokens     │
 │                            │ ◀────────────────────────│
```

The Fisher submits the user's signed transaction and gets paid in EVVM
tokens (typically the principal token, MATE) the user already held inside
their EVVM balance. The user pays for execution — but in EVVM-token
terms, not ETH.

## How EVVM ties payment + authorization together

Three building blocks make this safe:

1. **EIP-191 personal-sign signatures** are the wire format for every
   intent. Easy to produce from any wallet, easy to recover on-chain.
2. **A unified payload format** — every signature, no matter the
   operation, encodes the same envelope: `(evvmId, senderExecutor,
   hashPayload, originExecutor, nonce, isAsyncExec)`. The
   `hashPayload` is the only field that varies per operation.
3. **A centralized nonce system in `Core.sol`** — every signed op
   funnels through `Core.validateAndConsumeNonce`, which atomically
   verifies the signature, checks the nonce, and consumes it. There's
   no way to replay a signature against a different relayer or route.

Read **[EIP-191 signatures](./eip-191-signatures.md)** for the exact
payload, **[Dual signatures](./dual-signature.md)** for why service
operations need *two* signatures, **[Dual executor](./dual-executor.md)**
for the `senderExecutor` / `originExecutor` split, and
**[Nonces](./nonces.md)** for sync vs async + reservations.

## Why some operations need *two* signatures

Many EVVM service operations (staking, name registration, P2P swaps,
custom services that extend `EvvmService`) bundle two distinct on-chain
effects:

- An **action** against the service contract (e.g. stake X tokens).
- An **EVVM-internal `pay()`** that funds the service for the action.

These are signed separately so the protocol can:

- Atomically enforce both on-chain (if the pay fails, the action
  reverts; if the action fails, the pay is rolled back).
- Pay the Fisher out of the same `pay` (`priorityFee` field).
- Decouple the action's nonce from the pay's nonce, enabling parallel
  execution.

That's the **dual signature pattern**, covered on its own page.

## Replay protection

Each signature is bound to a specific *execution context* by the
combination of:

- The user's nonce (sync or async — see [Nonces](./nonces.md)),
- The `senderExecutor` (which contract delivers the call to Core),
- The `originExecutor` (which EOA started the chain),
- The `evvmId` (this EVVM instance's identifier — preventing replays
  across deployments).

Any one of those changing makes the signature invalid. A malicious
relayer can't reuse your signature through a different contract or a
different deployment.
