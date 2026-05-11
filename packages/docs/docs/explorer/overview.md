---
sidebar_position: 1
title: Overview
---

# EVVMScan overview

EVVMScan is a self-contained, etherscan-style block explorer at
**`/evvmscan`**. There's no backend, no indexer — everything runs in
your browser against the same RPC the rest of the app uses.

## What you can do

- **Browse the latest blocks and transactions** in real time (polled
  every ~1.5s)
- **Search** for a tx hash, block number, address, or `@username`
  (resolved via NameService) and jump to the right detail page
- **Decode** every transaction's input data and event logs against the
  bundled EVVM ABIs *and* your custom service ABIs
- **Inspect** address pages with EVVM-aware direction tagging
  (`Core.addBalance` shows up as **IN** for the credited user even when
  they're also `tx.from`)

## Why it's worth using

Most generic explorers don't speak EVVM. They show "Unknown function
0x4d2c8c4..." for a `Core.pay()` call. EVVMScan has the ABIs preloaded
so you see:

> **Pay** from `0xf39F…2266` → `@alice` · `50,000 MATE` (50000000000000000000000 wei)

with the senderExecutor / originExecutor / nonce / signature broken out
as their own rows.

## Pages

| Route | What it shows |
|-------|---------------|
| `/evvmscan` | Live home feed (latest blocks + latest transactions) |
| `/evvmscan/tx/[hash]` | A single transaction with overview / logs / input-data tabs |
| `/evvmscan/block/[number]` | A single block with prev/next navigation |
| `/evvmscan/address/[address]` | Address page with EVVM direction tags |

## How decoding works

`packages/nextjs/src/utils/explorer/decoder.ts` builds an `addr → ABI`
map from:

- The deployed core contracts (Core, Staking, NameService, Estimator,
  P2PSwap)
- Your custom services (read from the registry written at deploy time)
- A minimal ERC-20 ABI for unknown contracts that emit `Transfer` /
  `Approval`

For each tx, the explorer looks up the `to` address in this map and
calls viem's `decodeFunctionData` against the matching ABI. For each
log, it does the same against the *log's* address.

## How the local cache works

Live data is held in `localStorage` keyed by `chain ID + Core address`,
so reloading the page doesn't lose your tail of recent blocks. On every
mount the explorer validates the cache against the current chain head;
if anvil/hardhat was restarted (block head dropped or anchor hash
mismatches), the stale cache is dropped automatically.
