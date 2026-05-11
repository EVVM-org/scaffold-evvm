---
sidebar_position: 2
title: Staking
---

# Staking (`Staking.sol`)

`Staking` is EVVM's validator stake registry. Three flows feed into it
— Golden, Presale, and Public — and a fourth (service staking) lets
contracts stake on behalf of themselves.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/staking/Staking.sol`.

## The price of staking

```solidity
PRICE_OF_STAKING = 5083 * 10**18;
```

A constant, in **principal token units** (MATE) per **staking token**.
Staking 1 token costs 5,083 MATE.

## The four flows

### Golden staking — for the golden fisher

```solidity
goldenStaking(
    bool    isStaking,
    uint256 amountOfStaking,
    bytes   memory signaturePay
)
```

- Restricted to the **golden fisher** address (set at construction,
  governable via propose/accept).
- Unlimited amount per call.
- **Sync nonce** on the EVVM-pay (single signature for the pay only —
  no action signature, since the caller is already trusted).

### Presale staking — for whitelisted early stakers

```solidity
presaleStaking(
    address user,
    bool    isStaking,
    address senderExecutor,
    address originExecutor,
    uint256 nonce,
    bytes   memory signature,
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay
)
```

- **Whitelisted** — the user must be added by the admin via
  `addPresaleStaker(address)` or `addPresaleStakers(address[])`.
- **Capped at 800 stakers, 2 staking tokens each.**
- **Async nonce on the EVVM-pay** (always — enforced by the contract).
- Dual signature (action + pay).

### Public staking — for everyone

```solidity
publicStaking(
    address user,
    bool    isStaking,
    uint256 amountOfStaking,
    address senderExecutor,
    address originExecutor,
    uint256 nonce,
    bytes   memory signature,
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay
)
```

- Open to all users when public staking is enabled (governance toggle:
  `prepareChangeAllowPublicStaking()` / `confirm…`).
- Unlimited tokens per user.
- **Async nonce on the EVVM-pay** (same constraint as presale).
- Dual signature.

### Service staking — for contracts to stake themselves

A 3-step atomic process so a contract can stake from its own balance:

```solidity
prepareServiceStaking(uint256 amountOfStaking)  // step 1
// ... contract calls Core.caPay to fund itself ...
confirmServiceStaking()                         // step 3
```

Must run in the same transaction. Helpers in `EvvmService` wrap this
as `_makeStakeService(amount)` for custom services.

```solidity
serviceUnstaking(uint256 amountOfStaking)
```

Refunds the principal-token balance to the calling contract. Subject to
the same time-locked unstake delay as user staking.

## Hash builders for the action signatures

```solidity
keccak256(abi.encode("presaleStaking", isStaking, amountOfStaking))
keccak256(abi.encode("publicStaking",  isStaking, amountOfStaking))
```

(Golden staking has no action signature.)

## Time delays

| Constant | Value |
|----------|-------|
| `TIME_TO_ACCEPT_PROPOSAL` (governance) | **1 day** |
| Default re-stake delay | configurable via propose/accept |
| Default full-unstake delay | **30 seconds** (sandbox-tuned for local development) |

Both delays are governable. For a real deployment, the full-unstake
delay would typically be much longer than 30 seconds.

## Reading state

| View | Returns |
|------|---------|
| `getUserAmountStaked(account)` | Current staked amount for the user |
| `getAddressHistory(account)` | Full historical entries (`HistoryMetadata[]`) |
| `getAddressHistoryByIndex(account, index)` | Single history entry |
| `getSizeOfAddressHistory(account)` | History length |
| `getTimeToUserUnlockStakingTime(account)` | Timestamp when next stake is allowed (0 = now) |
| `getTimeToUserUnlockFullUnstakingTime(account)` | Timestamp when full-unstake is allowed |
| `priceOfStaking()` | `5083 * 10^18` |
| `getPresaleStaker(account)` | `(isAllowed, stakingAmount)` |
| `getPresaleStakerCount()` | Current presale roster size (max 800) |
| `getGoldenFisher()` / `getGoldenFisherProposal()` | Current and proposed golden fisher |
| `getEstimatorAddress()` | Linked Estimator |
| `getAllowPresaleStaking()` / `getAllowPublicStaking()` | Boolean flags + proposals |
| `getMateAddress()` | Principal token sentinel `0x…0001` |

## Yield claim

```solidity
gimmeYiel(address user) returns (
    bytes32 epoch,
    address token,
    uint256 amount,
    uint256 historyIndex,
    uint256 timestamp
)
```

Calls `Estimator.makeEstimation(user)` under the hood. Returns the
epoch identifier, the token paid, the amount, and bookkeeping fields
to update the user's history. See **[Estimator](./estimator.md)**.

## Governance surface (1-day time-locks unless noted)

- `proposeAdmin(_newAdmin)` / `acceptNewAdmin()` / `rejectProposalAdmin()`
- `proposeGoldenFisher(_goldenFisher)` / `acceptNewGoldenFisher()` /
  `rejectProposalGoldenFisher()`
- `proposeEstimator(_estimator)` / `acceptNewEstimator()` /
  `rejectProposalEstimator()`
- `proposeSetSecondsToUnlockStaking(_secs)` / `acceptSetSecondsToUnlockStaking()`
- `prepareSetSecondsToUnllockFullUnstaking(_secs)` / `confirmSetSecondsToUnllockFullUnstaking()` / `cancelSetSecondsToUnllockFullUnstaking()`
- `prepareChangeAllowPresaleStaking()` / `confirm…` / `cancel…` (toggles flag)
- `prepareChangeAllowPublicStaking()` / `confirm…` / `cancel…` (toggles flag)
- Presale roster: `addPresaleStaker(addr)`, `addPresaleStakers(addrs)`
  — admin-only.

## Where it shows up

`/evvm/staking` exposes all three user flows with one form per mode.
The form auto-fetches your current sync nonce, your next free async
nonce, and your current MATE balance, so you mostly fill in the
*amount* field and click sign. Estimated rewards (from Estimator) are
shown live.
