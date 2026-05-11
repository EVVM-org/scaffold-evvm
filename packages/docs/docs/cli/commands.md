---
sidebar_position: 1
title: CLI commands
---

# CLI commands

Every interactive command lives in `cli/commands/`. The entry point
(`cli/index.ts`) routes `npm run cli <name>` to the matching file.

## `npm run wizard` *(alias: `cli start`)*

The full setup. Runs every other CLI step in order:

1. `init` (framework + source selection)
2. `chain` (start anvil/hardhat)
3. `config` (admin addresses, fund them)
4. `deploy` (compile + deploy contracts)
5. Custom service detection + deploy
6. Frontend `.env` update
7. (optional) docs server spawn
8. `next dev`

Use this for a fresh start. `Ctrl+C` cleanly shuts everything down.

## `npm run cli init`

Run the framework + source selection only. Writes the answers to
`scaffold.config.json`. Useful when you want to switch frameworks
without redeploying.

## `npm run cli chain`

Spins up the local chain (anvil or hardhat depending on
`scaffold.config.json`'s `framework`). Doesn't deploy anything; just
starts the chain on port 8545.

Useful when you want a long-running chain to redeploy contracts against
multiple times.

## `npm run cli deploy`

Deploys the EVVM contracts to whatever chain is on port 8545. Assumes
the chain is already running (start it with `cli chain` or let `wizard`
do it for you).

If `services/<Name>/` directories exist, also deploys those after the
core contracts.

## `npm run cli config`

Prompts for the three EVVM admin addresses (admin, golden fisher,
activator) and writes them to `input/address.json`. Re-run this if you
change roles between deploys.

## `npm run cli flush`

Nuclear option. Clears:

- `packages/foundry/out/` (compile artifacts)
- `packages/foundry/cache/`
- `packages/nextjs/.next/` (Next.js cache)
- `deployments/` (deployment summaries)
- `packages/nextjs/public/customservices.json`

Kills any process holding ports 8545 and 3000. Use this whenever
something feels stale or broken.

## `npm run cli sources`

Checks for upstream contract source updates, clones them under
`Testnet-Contracts/` (gitignored) at the project root, and updates the
deploy script to use them. Use to track upstream changes between
scaffold-evvm releases.

## `npm run cli monitor` *(alias: `npm run monitor`)*

A real-time, ABI-decoded stream of every block, transaction, and
contract event on the local chain. Auto-loads ABIs from Foundry build
output, the evvm-js SDK, and bundled fallbacks.

Run it in a separate terminal alongside the wizard for debugging.

## `npm run cli help`

Prints the list of commands.
