---
sidebar_position: 6
title: P2PSwap
---

# P2PSwap (`P2PSwap.sol`)

`P2PSwap` is EVVM's peer-to-peer order book. Makers post limit orders
that lock `tokenA`; takers (or "dispatchers") fill them by paying
`tokenB`. Two fee models are supported.

In the bundled testnet contracts:
`packages/foundry/testnet-contracts/contracts/p2pSwap/P2PSwap.sol`.

`P2PSwap` extends `EvvmService`, so all user operations use the
**dual signature pattern** with **async nonces**.

## Markets and orders

A "market" is a `(tokenA, tokenB)` pair. Markets auto-create on the
first `makeOrder` for that pair — no admin action required.

Orders carry `(amountA, amountB)`: the maker is offering to sell
`amountA` of `tokenA` for `amountB` of `tokenB`. Order slots are
reused after cancellation, so order IDs are dense.

## `makeOrder(...)` — post a limit order

```solidity
makeOrder(
    address user,
    address tokenA,
    address tokenB,
    uint256 amountA,
    uint256 amountB,
    /* canonical EVVM plumbing: senderExecutor, originExecutor, nonce, signature */
    uint256 priorityFeePay,
    uint256 noncePay,
    bytes   memory signaturePay
) returns (uint256 market, uint256 orderId)
```

Locks `amountA` of `tokenA` from the maker into P2PSwap. Returns the
market ID and order ID.

## `cancelOrder(...)` — pull your offer

```solidity
cancelOrder(
    address user,
    address tokenA,
    address tokenB,
    uint256 orderId,
    /* dual sig fields */
)
```

Refunds the locked `tokenA` to the maker.

## `dispatchOrder_fillProportionalFee(...)` — fee scales with fill

```solidity
dispatchOrder_fillPropotionalFee(
    address user,
    address tokenA,
    address tokenB,
    uint256 orderId,
    uint256 amountOfTokenBToFill,
    /* dual sig fields */
)
```

Fills part or all of an order. Fee = `amountB × percentageFee /
10_000`. Defaults to **5% (500 basis points)**, configurable via
governance.

Overpayments are auto-refunded.

## `dispatchOrder_fillFixedFee(...)` — capped fee

```solidity
dispatchOrder_fillFixedFee(
    address user,
    address tokenA,
    address tokenB,
    uint256 orderId,
    uint256 amountOfTokenBToFill,
    /* dual sig fields */,
    uint256 maxFillFixedFee
)
```

Fee = `min(proportional fee, maxFillFixedFee)` with a **10% tolerance
window** — the contract accepts payment within `[fee - 10%, fee]` and
derives the actual fee from the payment.

`maxFillFixedFee` defaults to `0.001 ether`, configurable.

## Hash builders for the action signatures

```solidity
keccak256(abi.encode("makeOrder",      tokenA, tokenB, amountA, amountB))
keccak256(abi.encode("cancelOrder",    tokenA, tokenB, orderId))
keccak256(abi.encode("dispatchOrder",  tokenA, tokenB, orderId))  // both fill methods reuse this
```

## Fee distribution

When a fill collects a fee (in `tokenB`), it splits per
`rewardPercentage`:

| Recipient | Default | Notes |
|-----------|---------|-------|
| `seller` | **5000 bps (50%)** | Goes to the order maker, on top of `amountB` |
| `service` | **4000 bps (40%)** | Accumulates in P2PSwap's `balancesOfContract[token]` |
| `mateStaker` | **1000 bps (10%)** | Paid to the executor; if the executor is a registered staker, in MATE; otherwise in `tokenB` |

All three are basis points and sum to 10,000.

## Service self-staking

P2PSwap is itself a stakeable service — the contract owner can stake
its accumulated balance:

```solidity
stake(uint256 amount)        // owner-only — stakes from service balance
unstake(uint256 amount)      // owner-only — unstakes
addBalance(token, amount)    // owner-only — manual accounting tweak
```

## Views

| View | Returns |
|------|---------|
| `findMarket(tokenA, tokenB)` | Market ID, or 0 if not found |
| `getMarketMetadata(market)` | `MarketInformation` (pair, maxSlot, ordersAvailable) |
| `getAllMarketsMetadata()` | `MarketInformation[]` |
| `getOrder(market, orderId)` | `Order` (seller, amountA, amountB) |
| `getAllMarketOrders(market)` | All orders in a market |
| `getMyOrdersInSpecificMarket(user, market)` | The user's orders in that market |
| `getBalanceOfContract(token)` | Accumulated service-fee balance |
| `getOwner()` / `getOwnerProposal()` / `getOwnerTimeToAccept()` | Ownership state |
| `getPercentageFee()` / `getProposalPercentageFee()` | Proportional fee + proposal |
| `getMaxLimitFillFixedFee()` / `getMaxLimitFillFixedFeeProposal()` | Fixed-fee cap + proposal |
| `getRewardPercentage()` / `getRewardPercentageProposal()` | Fee split + proposal |
| `getProposedWithdrawal()` | `(token, amount, recipient, deadline)` |

## Governance — 30-second time-locks

- `proposeOwner(addr)` / `acceptOwner()` / `rejectProposeOwner()`
- `proposePercentageFee(_percentageFee)` / `acceptPercentageFee()` / `rejectProposePercentageFee()`
- `proposeMaxLimitFillFixedFee(_max)` / `acceptMaxLimitFillFixedFee()` / `rejectProposeMaxLimitFillFixedFee()`
- `proposeFillPropotionalPercentage(seller, service, mateStaker)` /
  `acceptFillPropotionalPercentage()` / `rejectProposeFillPropotionalPercentage()`
- `proposeFillFixedPercentage(seller, service, mateStaker)` /
  `acceptFillFixedPercentage()` / `rejectProposeFillFixedPercentage()`
- `proposeWithdrawal(token, amount, to)` / `acceptWithdrawal()` / `rejectProposeWithdrawal()`

## Where it shows up

`/evvm/p2pswap` renders both the maker UI (post a new order) and the
taker UI (browse open orders, fill them with either fee model).
EVVMScan classifies these calls under the `p2pswap` action category so
you can spot them in the live feed.
