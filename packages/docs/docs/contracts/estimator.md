---
sidebar_position: 3
title: Estimator
---

# Estimator (`Estimator.sol`)

`Estimator` is EVVM's reward calculation engine. It holds **no
balances** of its own — it tracks epochs, total staked, and reward
pools, and produces a per-user reward number when `Staking.gimmeYiel`
asks for one.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/staking/Estimator.sol`.

## Why it's separate from Staking

Two reasons:

1. **Upgradability without state migration.** The reward formula is
   the bit most likely to change. Putting it in a stateless contract
   means a fork of the formula doesn't require migrating staked
   balances.
2. **Cheap views.** Frontends call estimator views every block to show
   "estimated rewards" without paying the storage-read overhead of
   doing it inside Staking.

## The reward formula

```
averageSm = (sumSmT * 1e18) / (epochTFinal - epochTStart)
reward    = (averageSm * (totalPool / totalStaked)) / 1e18
```

`sumSmT` accumulates `(stakedAmount * timeElapsed)` over the user's
history within the epoch — a time-weighted average of their stake.

## Main functions

### `notifyNewEpoch(...)` — activator-only

```solidity
notifyNewEpoch(
    address tokenPool,    // reward token (typically MATE)
    uint256 totalPool,    // reward amount for the epoch
    uint256 totalStaked,  // snapshot total stake at epoch start
    uint256 tStart        // epoch start timestamp
)
```

Called by the activator role to begin a new epoch. Records the metadata
so subsequent `makeEstimation` calls have a denominator.

### `makeEstimation(user)` — staking-only

```solidity
makeEstimation(address user) returns (
    bytes32 epochAnswer,         // epoch the reward came from
    address tokenAddress,        // token paid (e.g. MATE)
    uint256 amountTotalToBeRewarded,
    uint256 idToOverwrite,       // history index to update
    uint256 timestampToOverwrite
)
```

The actual reward calculation. Returns `(0, address(0), 0, 0, 0)` if
the user has already claimed this epoch (double-claim guard).

### `simulteEstimation(user)` — public view

Same logic as `makeEstimation` but read-only. Used by the frontend to
show the live "estimated rewards" tile on `/evvm/staking`.

## Identifiers

```solidity
DEPOSIT_IDENTIFIER  = bytes32(uint256(1));
WITHDRAW_IDENTIFIER = bytes32(uint256(2));
BEGUIN_IDENTIFIER   = WITHDRAW_IDENTIFIER;
```

`epochId` increments by 1 each epoch and starts at `bytes32(uint256(3))`.

## Governance — 30-second time-locks

Unlike Staking (1-day delays), Estimator's governance uses **30-second**
delays — fast turnaround for tweaking the reward formula's
authorities:

- `setActivatorProposal(addr)` / `acceptActivatorProposal()` /
  `cancelActivatorProposal()`
- `setEvvmAddressProposal(addr)` / `acceptEvvmAddressProposal()` /
  `cancelEvvmAddressProposal()`
- `setAddressStakingProposal(addr)` / `acceptAddressStakingProposal()` /
  `cancelAddressStakingProposal()`
- `setAdminProposal(addr)` / `acceptAdminProposal()` /
  `cancelAdminProposal()`

## Views

| View | Returns |
|------|---------|
| `getEpochMetadata()` | Current `EpochMetadata` (tokenPool, totalPool, totalStaked, tFinal, tStart) |
| `getActualEpochInUint()` | `epochId - 2` as a uint |
| `getActualEpochInFormat()` | The current `bytes32` epoch identifier |
| `getActivatorMetadata()` | Activator address + proposal details |
| `getCoreAddressMetadata()` | Core address + proposal details |
| `getAddressStakingMetadata()` | Linked Staking + proposal details |
| `getAdminMetadata()` | Admin + proposal details |

## Where it shows up

`/evvm/staking` polls `Estimator.simulteEstimation(connectedAddress)`
to show your live estimated rewards. EVVMScan labels Estimator with
its own badge so you can recognize the pure-view calls in the live
feed.
