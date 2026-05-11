---
sidebar_position: 5
title: P2P Swap
---

# P2P Swap — `/evvm/p2pswap`

Two roles share this page: **Maker** (post orders) and **Taker** (fill
existing orders).

## Make an order

Fields:

- **Token A** + **amount A** — what you're giving up (locked into P2PSwap on submit)
- **Token B** + **amount B** — what you want in return
- **Priority fee** — paid to the relayer that submits your `makeOrder`
  call

Orders don't expire on-chain — they sit in the order book until
filled or cancelled.

When you sign, the offered amount is locked into the swap contract via
the dual-signature pattern (action + EVVM-pay).

## Cancel an order

Pulls the offered tokens back. The form takes a single field — the
order ID, which you can find in the order list below the form.

## Dispatch (fill) an order

Two flavors:

### Proportional fee

`dispatchOrder_fillPropotionalFee(orderId, amountOfTokenBToFill)`

Fee = `amountB × percentageFee / 10_000`. Default `percentageFee` is
**500 basis points (5%)** — configurable via governance.

The collected fee splits per the `rewardPercentage` config: 50%
seller / 40% service / 10% mateStaker by default.

### Fixed fee

`dispatchOrder_fillFixedFee(orderId, amountOfTokenBToFill, maxFillFixedFee)`

Fee = `min(proportional fee, maxFillFixedFee)`, with a 10% tolerance
window — the contract derives the actual fee from the payment within
`[fee - 10%, fee]`. Default `maxFillFixedFee` is **0.001 ether**.

## Where to look in the code

- `packages/nextjs/src/app/evvm/p2pswap/page.tsx` — page composition
- `packages/nextjs/src/lib/evvmSignatures.ts` — `signMakeOrder`,
  `signCancelOrder`, `signDispatchOrder*`
- `packages/nextjs/src/utils/transactionExecuters/p2pswapExecuter.ts` —
  submit functions
