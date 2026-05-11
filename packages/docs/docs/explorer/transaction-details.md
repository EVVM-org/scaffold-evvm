---
sidebar_position: 2
title: Transaction details
---

# Transaction details — `/evvmscan/tx/[hash]`

The deepest page in EVVMScan. Three tabs: **Overview**, **Logs**, and
**Input Data**.

## Overview tab

A summary of the transaction:

- **Status** — confirmed / failed (with revert reason if available)
- **Block / age / position** — where the tx landed
- **From / to** — sender (EOA) and recipient (contract or EOA)
- **Transaction Action** — a one-line description of what the tx does:
  - `EVVM Pay to @alice` for `Core.pay()`
  - `EVVM Disperse Pay (multi-recipient)` for `Core.dispersePay()`
  - `Stake via Public staking` for `Staking.publicStaking()`
  - `Pre-registration Username: @alice` for NameService
  - …and so on per service
- **Inferred transfers** — for EVVM operations the page reconstructs the
  intended token movements (since EVVM emits no events, this is the
  only way to see them in a browser without running the full node).
  Token amounts are rendered as `50,000 MATE (50000000000000000000000 wei)`
  so the raw and human values are both visible.
- **Gas used** + **gas price**

## Logs tab

Every event log emitted by the tx, decoded if the emitting address is
known. Each log shows:

- The contract that emitted it (with a badge: Core, Staking, ERC-20,
  CustomService, …)
- The event name + decoded arguments
- The raw topics + data, collapsed by default

EVVM core contracts deliberately emit no events (gas optimization), so
you'll see logs only from custom services or ERC-20 wrapper contracts.

## Input Data tab

The raw calldata, plus a fully decoded view if the destination address
is in the ABI map:

- **Function** — `Core.pay`, `Staking.publicStaking`, `Counter.bump`, …
- **Arguments** — every input field with its name, type, and value.
  EVVM-specific fields like `senderExecutor`, `originExecutor`,
  `signature`, `noncePay`, `signaturePay` are broken out so you can
  verify exactly what was signed.
- **Toggle** between decoded view and the raw `0x…` calldata

## Decoding custom services

When you deploy a contract from `services/<Name>/`, its ABI is added to
the explorer's address map automatically. Calls and logs from your
service get the same first-class treatment as core contracts: the
function name shows up instead of "Unknown", arguments are typed, and
events are decoded. The Action column is labeled
`<MethodName> (<Service Name>)`.
