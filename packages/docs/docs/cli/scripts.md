---
sidebar_position: 2
title: npm scripts
---

# Top-level npm scripts

The root `package.json` exposes shorter aliases for the most common
flows. All workspace commands also work via `npm run -w <workspace>
<script>`.

## Daily-driver scripts

| Script | What it does |
|--------|--------------|
| `npm run wizard` | Full setup + launch (recommended) |
| `npm run frontend` | Start `next dev` only (assumes contracts are deployed) |
| `npm run dev` | Same as `frontend` |
| `npm run monitor` | Real-time ABI-decoded blockchain feed |
| `npm run flush` | Clear caches + kill servers |
| `npm run lint` | Lint the Next.js workspace |

## Documentation

| Script | What it does |
|--------|--------------|
| `npm run docs:install` | One-time install of the Docusaurus workspace |
| `npm run docs` | Start the docs dev server (port 3001, proxied at `/docs`) |
| `npm run docs:build` | Build static docs into `packages/nextjs/public/docs/` |
| `npm run docs:serve` | Serve the static docs build on port 3001 |

## Build / production

| Script | What it does |
|--------|--------------|
| `npm run build` | Build the Next.js production bundle |
| `npm run start` | Run the production Next.js server |

## Per-workspace shortcuts

You can always target a workspace directly:

```bash
npm run -w @scaffold-evvm/foundry compile     # forge build --via-ir
npm run -w @scaffold-evvm/foundry test        # forge test -vvv
npm run -w @scaffold-evvm/foundry generate-abis

npm run -w @scaffold-evvm/hardhat compile     # delegates to forge
npm run -w @scaffold-evvm/hardhat test
npm run -w @scaffold-evvm/hardhat chain       # hardhat node --no-deploy

npm run -w @scaffold-evvm/nextjs type-check   # tsc --noEmit
```

## Environment variables

The frontend reads its config from `packages/nextjs/.env`, which is
populated by the wizard. The relevant keys:

| Var | What it is |
|-----|------------|
| `NEXT_PUBLIC_CHAIN_ID` | `31337` for local |
| `NEXT_PUBLIC_EVVM_ADDRESS` | Deployed Core address |
| `NEXT_PUBLIC_STAKING_ADDRESS` | Deployed Staking address |
| `NEXT_PUBLIC_ESTIMATOR_ADDRESS` | etc. |
| `NEXT_PUBLIC_NAMESERVICE_ADDRESS` | |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | |
| `NEXT_PUBLIC_P2PSWAP_ADDRESS` | |
| `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS` | Per-custom-service address (one per service) |
| `NEXT_PUBLIC_CONFIG_VERSION` | Cache-busting key |
| `NEXT_PUBLIC_PROJECT_ID` | Reown / WalletConnect project ID (optional on local) |
| `NEXT_PUBLIC_DOCS_DEV_URL` | Override for the docs proxy target (default `http://localhost:3001`) |

Restart `next dev` after changing any of these — Next.js bakes them
into the bundle at server start.
