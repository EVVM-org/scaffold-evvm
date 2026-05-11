---
sidebar_position: 10
title: Config
---

# Config — `/config`

Frontend-side configuration that doesn't require a redeploy.

## What you can change

- **RPC URL** — override the default `http://localhost:8545` if you're
  pointing the frontend at a different chain (a forked anvil, a remote
  RPC, etc.)
- **Reown / WalletConnect project ID** — needed only for non-local
  WalletConnect connections; safe to ignore on local development
- **Display preferences** — dark/light theme, decimal display formatting

## What it can't change

- **Contract addresses** — those are baked into the bundle from `.env`.
  Change them via the wizard or by editing `packages/nextjs/.env`
  directly and restarting the dev server.
- **Chain ID** — set in `.env` as `NEXT_PUBLIC_CHAIN_ID`. Restart needed.

## Where settings are stored

`localStorage` under the `scaffold-evvm:config:*` keys. Clearing your
browser storage resets everything to defaults.
