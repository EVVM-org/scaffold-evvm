---
sidebar_position: 6
title: Treasury
---

# Treasury — `/evvm/treasury`

The page that bridges ERC-20 tokens between an external chain and EVVM.

## Deposit

Fields:

- **Token** — the ERC-20 contract on the external chain
- **Amount** — how much to escrow
- The page also shows whether you have an existing approval for that
  token, and exposes an "Approve" button if you don't

The deposit flow is two on-chain calls:

1. `token.approve(treasury, amount)` (skipped if you already have a
   sufficient allowance)
2. `treasury.deposit(token, amount)`

After the deposit lands, your EVVM balance for that token goes up by
`amount`.

## Withdraw

Fields:

- **Token** + **amount**

The withdraw is a direct caller call — Treasury debits your Core
balance and transfers the asset back to `msg.sender`. **Note:** the
principal token (MATE, `0x…0001`) is not withdrawable.

> **No signatures.** Treasury operations are direct caller balance
> ops — your wallet pays gas and is the recipient. Unlike the other
> EVVM services, Treasury does not use the dual-signature pattern.

## Local development note

In a real EVVM deployment, Treasury sits on each external chain and
the EVVM ledger lives on its host chain (with the **Fisher Bridge**
relaying between them). With scaffold-evvm everything is on the same
local anvil instance, so the deposit/withdraw round-trip looks like a
no-op bridge — it just moves balance between the two ledgers (the
EVVM-side balance and the ERC-20 balance) on the same chain.

## When fisher nonces appear

Cross-chain Fisher Bridge operations (not surfaced by this page on a
single-chain local setup) use a separate `getNextFisherDepositNonce(user)`
nonce track on Core, distinct from the standard sync/async nonce
pools. See **[Nonces](../concepts/nonces.md)** for details.
