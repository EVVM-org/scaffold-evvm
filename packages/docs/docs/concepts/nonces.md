---
sidebar_position: 5
title: Nonces
---

# Nonces

EVVM's nonce system is **centralized in `Core.sol`** — every signed
operation, no matter which service it targets, funnels through the same
`Core.validateAndConsumeNonce` and consumes from the same per-user
nonce state. This prevents replay across services in addition to within
a single service.

There are two nonce systems per user. Picking the right one is the
difference between operations that race cleanly and operations that get
stuck behind a slow predecessor.

## Sync nonces

- **Sequential.** `n+1` only lands after `n` has landed.
- Read with `Core.getNextCurrentSyncNonce(user)`.
- Used when `isAsyncExec = false` (also called `priorityFlag = false`
  in older guides).

Use sync when *order* matters — e.g. a sequence of operations that
build on each other.

## Async nonces

- **Out-of-order.** Any nonce can land at any time, as long as it
  hasn't been consumed yet.
- Generate any unique `uint256` per address yourself, or query
  `Core.getNextFreeAsyncNonce(user)` for a convenient unused one.
- Check status: `Core.getIfUsedAsyncNonce(user, nonce)` →
  `bool`. For richer info: `Core.asyncNonceStatus(user, nonce)`
  (free / reserved / used).
- Used when `isAsyncExec = true`.

Use async when you want to fire many operations in parallel and don't
want one slow tx to block the rest. Each async nonce is "claimed" the
first time it's used; the order of claims is irrelevant.

## Async nonce reservations

A service can **reserve** an async nonce for a specific user before it
gets consumed:

| Function | Purpose |
|----------|---------|
| `reserveAsyncNonce(user, nonce, service)` | Pre-allocate the slot |
| `revokeAsyncNonce(user, nonce)` | Release an unused reservation |
| `getAsyncNonceReservation(user, nonce)` | Query who holds the reservation |

When a nonce is reserved, only the reserving service can consume it.
This is useful for atomic multi-step flows: a service prepares the
state, reserves a slot, and consumes it later when the user supplies
the matching signature — without worrying that a competing relayer
could grab the slot in between.

## Per-track nonces

Some operations live in their own nonce track, separate from the main
sync/async pool:

| Track | Function to read next nonce |
|-------|-----------------------------|
| Core EVVM-pay (default) | `Core.getNextCurrentSyncNonce(user)` (sync) or `Core.getNextFreeAsyncNonce(user)` (async) |
| Fisher Bridge deposits (cross-chain) | `Core.getNextFisherDepositNonce(user)` |

Fisher deposits use a sequential per-user counter that doesn't collide
with regular EVVM-pay nonces. So a user's pending fisher deposit
doesn't block their regular pays and vice versa.

## Action vs pay nonces (dual signatures)

For service operations using the **dual signature pattern**, you have
two nonces to manage:

- **Action nonce** — for the service-specific action signature.
- **Pay nonce** — for the EVVM-pay fee transfer.

They're independent. You can have a sync action with an async pay, or
any combination — but specific services may force one of them.
Examples from the bundled contracts:

- `Staking.presaleStaking` and `Staking.publicStaking` always use
  **async** for the EVVM-pay portion (enforced inside the contract,
  regardless of what you pass for the action).
- `Staking.goldenStaking` uses **sync** on both sides (golden fisher only).

Per-contract specifics are documented in
**[Core Contracts](../contracts/core.md)** and the per-service pages.

## The "nonce too low/high" wallet error

The wallet error you see when redeploying anvil is *not* an EVVM nonce
— it's the standard Ethereum nonce on your EOA. EVVM nonces only live
inside `Core`'s storage, so they can't get out of sync the same way.
See **[Troubleshooting](../getting-started/troubleshooting.md)** if
you're hitting that error.
