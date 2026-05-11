---
sidebar_position: 2
title: Payments
---

# Payments — `/evvm/payments`

The page that sends EVVM tokens between users.

## Two flows

### Single recipient — `pay()`

Fields:

- **From** — defaults to the connected wallet
- **To address** *or* **To identity** — pick one. If you fill in a
  username (e.g. `alice`), Core resolves it on-chain via NameService.
- **Token** — defaults to MATE
  (`0x0000000000000000000000000000000000000001`)
- **Amount** — entered as a human-readable decimal (e.g. `10.5`); the UI
  converts to wei using the token's decimals
- **Priority fee** — paid to the executor; raise it to make your tx more
  attractive to relayers
- **Nonce** — auto-fetched from `getNextCurrentSyncNonce` (sync) or
  `getNextFreeAsyncNonce` (async) based on the priority toggle

### Multi-recipient — `dispersePay()`

Same shape but the recipients are an editable list of `(to, amount)`
pairs. One signature, one tx, many recipients. Useful for payroll,
airdrops, or quick batches.

## What happens when you click "Sign and submit"

1. The frontend builds the EIP-191 payload via
   `packages/nextjs/src/lib/evvmSignatures.ts`.
2. Your wallet prompts for the signature (one prompt for `pay`, one for
   each recipient on `dispersePay` if your wallet doesn't batch).
3. The frontend submits the signed call via the executor
   (`utils/transactionExecuters/evvmExecuter.ts` or
   `lib/evvmExecutors.ts` depending on the form).
4. The tx hash is shown on success; click it to jump to the EVVMScan
   transaction page.

## Common gotchas

- **"Insufficient balance"** — your EVVM-side balance for the chosen
  token is too low. Visit `/faucet` to top up MATE.
- **"Bad signature"** — the wallet signed something different from what
  the contract expected. Almost always caused by a stale nonce; refetch.
- **Identity not found** — the username you typed isn't registered on
  this local chain. Check `/evvm/nameservice` first.
