---
sidebar_position: 3
title: Wizard walkthrough
---

# Wizard walkthrough

`npm run wizard` is the front door. It's a TypeScript script (`cli/index.ts`)
that orchestrates every other CLI command in sequence.

## Phase 1 — Framework selection

```
? Which framework do you want to use?
  ❯ Foundry (recommended)
    Hardhat
```

Both frameworks compile with `forge` under the hood, so this choice mostly
affects the deploy script style and what runtime test/scripting tooling is
available afterwards. Pick **Foundry** unless you specifically need
Hardhat's plugin ecosystem.

## Phase 2 — Contract source

```
? Which contract source do you want?
  ❯ Testnet (production-ready)
```

The testnet sources are pulled from
[`EVVM-org/Testnet-Contracts`](https://github.com/EVVM-org/Testnet-Contracts)
on the `feat/state` branch (matching the bundled snapshot in
`packages/foundry/testnet-contracts/`).

## Phase 3 — Admin addresses

```
? Admin address           ›
? Golden Fisher address   ›
? Activator address       ›
```

These three roles control governance/proposal-style functions on Core. For
local development you can use any address you control — the test EOA
(`0xf39Fd6...`) is fine for all three.

## Phase 4 — Funding

The wizard asks if it should fund those admin addresses with test ETH from
the deployer EOA. Say yes — without it the admin actions would silently
fail.

## Phase 5 — Compile + deploy

The wizard then:

1. Generates `input/Inputs.testnet.sol` from your answers
2. Runs `forge build --via-ir`
3. Spawns `anvil` on port 8545 (`--block-time 10`)
4. Runs `Deploy.testnet.s.sol`, deploying the six core contracts in order

If `services/<Name>/<Name>.sol` exists in the project, those services are
also compiled and deployed in the same wizard run. The deployed address of
each service is recorded in `deployments/customcontracts.json`.

## Phase 6 — Frontend env + launch

The wizard writes every deployed address into `packages/nextjs/.env` with
`NEXT_PUBLIC_*` prefixes (so they reach the client bundle), clears the
Next.js `.next/` cache (so the new env is picked up), then launches the
dev server with `npm run dev`.

If you've installed the docs workspace (`npm run docs:install`), the wizard
also offers to start the Docusaurus dev server in the background so
`/docs` works alongside the rest of the app.

## Phase 7 — You

The terminal streams `next dev` output. Open `http://localhost:3000` and
start exploring. `Ctrl+C` shuts down anvil, the frontend, and the docs
server cleanly.
