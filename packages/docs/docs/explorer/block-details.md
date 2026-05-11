---
sidebar_position: 4
title: Block details
---

# Block details — `/evvmscan/block/[number]`

A single block with everything in it.

## Header

- **Block number** with prev / next navigation buttons
- **Timestamp** + relative age
- **Hash**, **parent hash**
- **Miner / sequencer** (the local chain's coinbase)
- **Gas used / gas limit** with a percentage bar
- **Tx count**

## Transactions

A table of every transaction included in the block, with the same
columns as the home-page tx feed:

- Hash · Method · From · To · Value · Gas used · Direction (if you came
  from an address page)

Each row links to the transaction's full detail page.

## Limits

The block detail page works for any block on the live chain — it pulls
data on-demand via `client.getBlock`, so old blocks load fine. But
because the explorer doesn't run an indexer, there's no way to filter
"all transactions involving address X across all blocks" without
walking each one. The address page shows you only the recent window;
deeper history requires running an external indexer (Subgraph, Ponder,
etc.) which is out of scope for scaffold-evvm.
