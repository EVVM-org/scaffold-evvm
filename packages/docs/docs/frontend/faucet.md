---
sidebar_position: 9
title: Faucet
---

# Faucet — `/faucet`

A one-click MATE top-up for local development. Hidden in non-local
environments because it would be a backdoor.

## What it does

Calls `Core.addBalance(user, MATE_TOKEN, amount)` against the connected
address. The default amount is `10000 MATE` — enough for hundreds of
pays, several stakes, and a name registration.

## When to use it

- After every redeploy (your EVVM balances reset along with the chain)
- Whenever a tx fails with "insufficient balance"
- Before testing high-volume paths (disperse pay with many recipients,
  multiple staking ops in parallel)

## When it won't work

The faucet checks `chainId === 31337` (the standard local Anvil/Hardhat
ID) and refuses to render anywhere else. If you're on a real testnet,
use the official EVVM faucet — the link is in the page if you reach it
on the wrong chain.
