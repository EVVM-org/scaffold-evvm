---
sidebar_position: 7
title: Register
---

# Register — `/evvm/register`

The first place a new EVVM user goes. It mints the user's initial EVVM
balance so they have something to spend in subsequent operations.

## What it does

Calls `Core.addBalance(user, token, amount)` for the connected address.
On a fresh local deployment this is the only way to bootstrap a balance
without using the faucet.

## Fields

- **User** — defaults to your connected wallet, can be changed for admin
  use cases
- **Token** — defaults to MATE
- **Amount** — human-readable decimal

## Why this isn't `/faucet`

The two pages are subtly different:

- **`/evvm/register`** — for the *initial* balance of a new user; uses
  the canonical `addBalance` flow with appropriate nonces and signature.
- **`/faucet`** — a development-only convenience that calls the same
  underlying function, but with a "give me 10000 MATE right now" button
  and no signature ceremony. Only available on local chains.

In a real testnet or mainnet, register is what you'd use; faucet is just
a local-dev shortcut.
