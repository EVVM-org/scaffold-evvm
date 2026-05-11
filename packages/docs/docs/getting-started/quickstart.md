---
sidebar_position: 2
title: Quickstart
---

# Quickstart

Already cloned and `npm install`ed? Then it's one command:

```bash
npm run wizard
```

The wizard does everything:

1. ✅ Checks prerequisites (Node, Foundry, Git)
2. 📦 Auto-clones `Testnet-Contracts` from GitHub if missing
3. 🔧 Asks you to pick a framework (Foundry or Hardhat)
4. 📦 Asks you to pick a contract source (testnet)
5. ⚙️ Prompts for the three EVVM admin addresses (admin, golden fisher, activator)
6. 🔨 Compiles the contracts (`forge build --via-ir`)
7. ⛓️ Starts the local chain on port `8545`
8. 🚀 Deploys all six EVVM contracts plus any services in `services/`
9. ✏️ Writes the deployed addresses into `packages/nextjs/.env`
10. 🌐 Launches the Next.js frontend at `http://localhost:3000`

Keep the terminal open — when you press `Ctrl+C` everything (anvil, the
frontend, optionally the docs server) stops.

## What to do once the frontend is up

Open `http://localhost:3000` in any browser. The home page shows the
addresses of every deployed contract.

A typical first run looks like:

1. Open MetaMask (or Rabby) and **import** the test private key (see
   [Local Network](#local-network) below). Do **not** use WalletConnect for
   localhost — it doesn't work.
2. Visit **`/evvm/register`** to create your first user balance on EVVM.
3. Visit **`/faucet`** to mint yourself some MATE so you can pay for things.
4. Visit **`/evvm/payments`** and send your first pay.
5. Visit **`/evvmscan`** to watch the transaction land in the explorer.

## Local Network

Both Anvil and Hardhat Network ship with the same default test account:

| | |
|---|---|
| Port | `8545` |
| Chain ID | `31337` |
| Test address | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Test private key | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |

> ⚠️ These are **publicly known** keys baked into Foundry/Hardhat. Never use
> them on networks with real value.

## Hit a wall?

See **[Troubleshooting](./troubleshooting.md)** — most issues are solved by
`npm run cli flush`.
