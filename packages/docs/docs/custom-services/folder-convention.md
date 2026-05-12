---
sidebar_position: 2
title: Folder convention
---

# Folder convention

```
services/
├── README.md
└── <YourService>/
    ├── <YourService>.sol      ← required: one main contract
    ├── Deploy.s.sol           ← optional: custom Foundry deploy script
    ├── manifest.json          ← optional: annotations (see Manifest)
    └── README.md              ← optional: docs for your service
```

One folder per service. The folder name is the service's slug
(lowercase, URL-safe) and drives both the route (`/services/<name>`)
and the generated `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS` env variable.

## Compilation

`services/` is symlinked into `packages/foundry/contracts/services/`,
so any `.sol` file you add is picked up by the standard `forge build
--via-ir` pipeline. Imports work the same way they do anywhere else:

```solidity
pragma solidity 0.8.30;

import "@scaffold-evvm/testnet-contracts/library/EvvmService.sol";
import "@scaffold-evvm/testnet-contracts/interfaces/ICore.sol";

contract Counter {
    uint256 public count;
    function bump() external { count += 1; }
}
```

## How the wizard discovers your service

`npm run wizard` scans `services/*/` for any directory containing at
least one `.sol` file and lists them. You choose which to deploy; the
wizard then:

1. Re-runs `forge build --via-ir` to make sure artifacts are fresh
2. Reads the artifact from `packages/foundry/out/<File>.sol/<Contract>.json`
3. Resolves constructor arguments (see [Constructor resolution](#constructor-resolution))
4. Sends the deploy tx
5. Writes the deployed address to:
   - `deployments/customcontracts.json` (canonical record)
   - `packages/nextjs/.env` (as `NEXT_PUBLIC_CUSTOM_<NAME>_ADDRESS`)
   - `packages/nextjs/public/customservices.json` (the registry the
     frontend reads to render `/services`)

## Constructor resolution

The wizard inspects the constructor's ABI and tries to fill each
parameter:

| Parameter type / name | How it's resolved |
|-----------------------|-------------------|
| `address _core` / `_evvm` / etc. matching a known role | Auto-filled with the deployed address |
| `address _staking` / `_nameService` / `_p2pSwap` | Same |
| `address _owner` / `_admin` / `_treasury` | Defaults to the deployer EOA |
| Other `address` | Prompts you to enter or pick a fresh deployer-funded address |
| `uint256` / `uint8` / etc. | Prompts you for a value with sensible defaults |
| `bool` | Prompts yes/no |
| Arrays / structs | Falls back to a JSON entry; usually you'll write a `Deploy.s.sol` instead |

If the auto-resolver can't figure out a parameter, the wizard says so
and asks you to add a `Deploy.s.sol` to the service folder.

> **`EvvmService` reminder:** the abstract base
> `constructor(address coreAddress, address stakingAddress)` requires
> **both** Core and Staking — so your contract's constructor must
> accept and forward two addresses. The wizard auto-fills both based
> on parameter names.

## Custom Deploy.s.sol

When the auto-resolver isn't enough, drop a `Deploy.s.sol` in the
service folder and the wizard will run it via `forge script` instead.
Same pattern as the core deploy scripts — read inputs from
`input/Inputs.testnet.sol` if you need them.
