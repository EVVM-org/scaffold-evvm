---
sidebar_position: 2
title: Monorepo layout
---

# Monorepo layout

Scaffold-EVVM uses npm workspaces. Each workspace lives under
`packages/*` and is named `@scaffold-evvm/<workspace>`.

## Workspaces

### `@scaffold-evvm/foundry`

```
packages/foundry/
├── foundry.toml              # via-ir + optimizer runs: 300
├── testnet-contracts/        # Bundled snapshot of EVVM contracts (production)
│   ├── contracts/            # Implementation: Core, Staking, NameService, etc.
│   ├── interfaces/           # ICore, IStaking, INameService, IP2PSwap, ...
│   └── library/              # SignatureRecover, EvvmService, nonce services
├── playground-contracts/     # Experimental sources (extra debug functions)
├── contracts/
│   └── services/             # Symlinked from <repo>/services — your custom code
├── script/
│   ├── Deploy.testnet.s.sol  # Deploy script for the bundled testnet sources
│   └── Deploy.playground.s.sol
└── out/                      # forge build artifacts (per-source ABIs + bytecode)
```

### `@scaffold-evvm/hardhat`

A thin Hardhat wrapper that delegates compilation to forge. Same contract
sources, same deploy outputs — just with Hardhat's task runner if you need
its plugin ecosystem.

### `@scaffold-evvm/nextjs`

The user-facing app. Notable directories:

```
packages/nextjs/src/
├── app/                      # Next.js 15 App Router pages
│   ├── evvm/                 # /evvm/{payments,staking,nameservice,...}
│   ├── evvmscan/             # /evvmscan/{tx,address,block}
│   ├── services/             # /services/{,<slug>}
│   ├── faucet/
│   └── config/
├── components/
│   ├── shell/                # TopBar, Sidebar, navItems, icons
│   ├── ui/                   # Button, Card, Stat, Input, Select, ... (the "Pro Max" design system)
│   └── explorer/             # EVVMScan-specific components
├── hooks/                    # useExplorerClient, useLatestBlocks, useCustomServices, ...
├── lib/
│   ├── evvmSignatures.ts     # All EIP-191 signature builders
│   └── evvmExecutors.ts      # Submit functions used by /evvm/payments
├── utils/
│   ├── transactionExecuters/ # Submit functions used by SigConstructor components
│   ├── explorer/             # buildAbiMap, decodeTxInput, classifyTx, ...
│   └── services/             # signing.ts (custom service auto-signing)
└── types/
    └── services.ts           # ServicesRegistry shape
```

### `@scaffold-evvm/docs`

The Docusaurus site you're reading. Lives in `packages/docs/`:

```
packages/docs/
├── docusaurus.config.ts      # baseUrl: '/docs', theme overrides
├── sidebars.ts               # The left-hand navigation tree
├── docs/                     # All MDX content (this is what you're reading)
├── src/css/custom.css        # Theme overrides matching scaffold-evvm tokens
└── static/img/               # Logos and images
```

## The `services/` directory

`services/` lives at the *project root*, not inside any workspace, because
it's the shared input to two workspaces:

- `packages/foundry/contracts/services/` is a symlink to `<repo>/services`
  (so forge picks the .sol files up via its normal source search)
- `packages/nextjs/public/customservices.json` is generated from the
  deployed addresses + ABIs of the contracts forge just built

The split keeps user code outside any framework-specific package, so the
same service folder works whether you chose Foundry or Hardhat.

## Top-level scripts that aren't workspaces

- `cli/` — The interactive wizard, run via `tsx`
- `scripts/` — One-off utilities (`check-env.js`, `copy-docs-build.js`)
- `design-system/scaffold-evvm/` — Documentation of the Pro Max design tokens
