---
sidebar_position: 3
title: Contract sources
---

# Contract sources

Scaffold-EVVM ships with bundled snapshots of every EVVM contract so you
can deploy entirely offline. The bundled sources are the source of truth
for the wizard's default flow.

## Bundled sources

```
packages/foundry/testnet-contracts/    ← Production-ready (bundled snapshot)
packages/foundry/playground-contracts/ ← Experimental (extra debug functions)
```

Both are also published as standalone repositories:

| Bundled path | Source repo |
|--------------|-------------|
| `packages/foundry/testnet-contracts/` | [`EVVM-org/Testnet-Contracts`](https://github.com/EVVM-org/Testnet-Contracts) |
| `packages/foundry/playground-contracts/` | (internal experimental branch) |

When you choose **Testnet** in the wizard, scaffold-evvm uses the bundled
snapshot. If you want to track upstream changes, run:

```bash
npm run cli sources
```

This command checks the upstream repo, clones it under `Testnet-Contracts/`
in the project root (gitignored), and updates the deploy script to use the
fresh sources.

## Why two sets of sources?

- **Testnet** — what you'd actually deploy to a test/production network.
  No debug functions, no time-skip helpers, real timelocks.
- **Playground** — the same contracts with extra functions for
  experimentation. Currently only used internally for protocol R&D.

> **Heads-up:** Even the testnet sources have all timelocks patched down
> to 30 seconds for local development. Check `library/EvvmServiceFinality.sol`
> if you need to know exact values.

## How forge finds the sources

`packages/foundry/foundry.toml` declares remappings so contracts can
reference each other through stable paths:

```toml
remappings = [
  "@scaffold-evvm/testnet-contracts/=testnet-contracts/",
  "@scaffold-evvm/playground-contracts/=playground-contracts/",
]
```

So a custom service can import EVVM library code with:

```solidity
import "@scaffold-evvm/testnet-contracts/library/EvvmService.sol";
import "@scaffold-evvm/testnet-contracts/interfaces/ICore.sol";
```

regardless of where the contract physically lives.

## Solidity / EVM version

| Setting | Value |
|---------|-------|
| Solidity | `0.8.30` |
| EVM target | `cancun` |
| Compiler flag | `--via-ir` |
| Optimizer runs | `300` |

These are chosen to match what EVVM ships in production. Don't change them
in your custom services unless you have a specific reason — anything you
deploy to a real EVVM network will use these exact settings.
