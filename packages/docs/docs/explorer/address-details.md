---
sidebar_position: 3
title: Address details
---

# Address details — `/evvmscan/address/[address]`

A multi-purpose address page. Renders different cards depending on
whether the address is an EOA, a known contract (Core, Staking, …), a
custom service, or unknown.

## Top card

Always present:

- **Type** — Contract or EOA, detected by checking `getBytecode`
- **ETH balance** — `getBalance` from the RPC
- **MATE (EVVM) balance** — read from `Core.getBalance(address, MATE)`
- **Staked** — read from `Staking.getUserAmountStaked(address)`

For known contracts the top card adds a badge labelling its role
(Core / Staking / Estimator / NameService / Treasury / P2PSwap / Admin /
Golden Fisher / Activator).

## Recent transactions

A table of every tx in the live polling window where this address
appears as `from` *or* `to`. Each row has:

- **Hash** — link to the transaction details page
- **Method** — decoded method name (badge-styled like a tag)
- **Block** — link to the block details page
- **Age** — relative time since the tx landed
- **Direction** — IN / OUT / SELF / CALL based on EVVM-aware analysis
  (see below)
- **Value** — ETH value transferred

The polling window is bounded — anything older than the last ~100
transactions falls off and is no longer shown.

## EVVM-aware direction

A naive explorer would tag any tx where you're `tx.from` as **OUT**.
That's wrong for EVVM. `Core.addBalance(user, MATE, 1000)` mints to
`user` even when `user` is also the sender — it's an **IN**.

EVVMScan gets this right:

| Function | `tx.from === address` | Effect on `address` | Direction |
|----------|----------------------|---------------------|-----------|
| `Core.addBalance(user=ME)` | yes | balance up | IN |
| `Core.removeAmountFromUser(user=ME)` | yes | balance down | OUT |
| `Core.pay(from=ME, to_address=ALICE)` | yes | balance down | OUT |
| `Core.pay(from=BOB, to_address=ME)` | no | balance up | IN |
| `Core.dispersePay(from=ME, toData=[…ME…])` | yes | balance both ways | SELF |
| `Staking.publicStaking(user=ME)` | yes | balance down (fee) | OUT |
| any other call | yes | nothing measurable | CALL |

The logic lives in `packages/nextjs/src/utils/explorer/classifier.ts`
(`classifyAddressDirection`).

## Custom Service card

If the address is a deployed custom service, EVVMScan adds a "Custom
Service" card at the bottom with:

- The service name (from `services/<Name>/manifest.json` or the folder
  name)
- A badge showing function/event counts
- A deep-link to `/services/<slug>` (the auto-generated read/write UI)
- A collapsible JSON viewer showing the full ABI
