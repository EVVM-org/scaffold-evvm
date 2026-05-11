---
sidebar_position: 3
title: Staking
---

# Staking — `/evvm/staking`

Three modes share this page: **Golden**, **Presale**, **Public**.

## Layout

The page renders one card per mode. Each card has:

- A description of what the mode is for
- The fields needed for that flow (amount, nonces, executor)
- A live "Estimated rewards" tile read from `Estimator`
- A current "Total staked" tile read from `Staking.getUserAmountStaked`

## Mode-specific behaviour

### Golden

- Restricted to the **golden fisher** address.
- Single pay signature only — no action signature (the caller is
  trusted by role).
- Sync nonce on the EVVM-pay.
- Unlimited amount per call.

### Presale

- Whitelisted users only (admin maintains the roster via
  `addPresaleStaker`).
- **Capped at 800 stakers, 2 staking tokens each.**
- Dual signature pattern (action + EVVM-pay).
- **EVVM-pay always uses `isAsyncExec = true`** (enforced by the
  contract).
- Action signature can use sync or async; the UI defaults to async to
  match the pay.

### Public

- Open to all users when public staking is enabled (governance
  toggle).
- Unlimited tokens per user.
- Same dual-signature + async-pay constraint as presale.

Each staking token costs **`5083 × 10^18` MATE** (the
`PRICE_OF_STAKING` constant). The default unstake delay in the
sandbox-tuned local build is **30 seconds**.

## Unstaking

Each card has an `isStaking` toggle. Switch it to "Unstake" and the same
form unstakes the given amount.

## Reading rewards

The "Estimated rewards" tile polls `Estimator.getEstimatedRewards`
roughly every 5 seconds. To actually claim the rewards, use the
respective claim function (the staking modes accumulate rewards into
your EVVM balance once a stake/unstake action settles).

## Where to look in the code

- `packages/nextjs/src/app/evvm/staking/page.tsx` — page composition
- `packages/nextjs/src/lib/evvmSignatures.ts` — `signGoldenStaking`,
  `signPresaleStaking`, `signPublicStaking`
- `packages/nextjs/src/utils/transactionExecuters/stakingExecuter.ts` —
  submit functions
