# Scaffold-EVVM New Architecture Implementation Plan

## Executive Summary

Transform scaffold-evvm from a frontend-only signature constructor tool into the **primary unified development environment** for EVVM ecosystem development. The new architecture will support:

1. **Dual Framework Support**: Choose between Foundry or Hardhat for smart contract development
2. **Dual Contract Source**: Deploy either Testnet-Contracts (production-ready) or Playground-Contracts (experimental)
3. **Interactive CLI Wizard**: TypeScript-based wizard for guided deployment and configuration
4. **Integrated Frontend**: Next.js frontend with signature constructors and contract interaction

---

## Current State Analysis

### scaffold-evvm (Current)
- Pure frontend application (Next.js)
- Signature constructor for EVVM operations
- No deployment capabilities
- Located in: `frontend/` subdirectory

### Testnet-Contracts
- Production-ready EVVM contracts
- Foundry-based with `npm run wizard` for deployment
- Full test coverage
- 6 core contracts: Evvm, NameService, Staking, Estimator, Treasury, P2PSwap

### Playground-Contracts
- Experimental/prototyping environment
- Foundry-based with makefile commands
- Extensive unit/fuzz test suite
- Same 6 core contracts (experimental versions)

### scaffoldethfroundryevvm
- Scaffold-ETH 2 fork with Foundry
- Monorepo: `packages/foundry` + `packages/nextjs`
- Example of proper Foundry integration

### scaffoldethevvmhardhat
- Scaffold-ETH 2 fork with Hardhat
- Monorepo: `packages/hardhat` + `packages/nextjs`
- Example of proper Hardhat integration

---

## New Architecture Design

```
scaffold-evvm/
├── cli/                          # NEW: Interactive CLI wizard
│   ├── index.ts                  # Main entry point
│   ├── commands/
│   │   ├── init.ts               # Project initialization
│   │   ├── deploy.ts             # Contract deployment
│   │   ├── chain.ts              # Local chain management
│   │   └── config.ts             # Configuration management
│   ├── prompts/
│   │   ├── framework.ts          # Foundry vs Hardhat selection
│   │   ├── contracts.ts          # Testnet vs Playground selection
│   │   ├── network.ts            # Network selection
│   │   └── wallet.ts             # Wallet configuration
│   ├── utils/
│   │   ├── prerequisites.ts      # System requirements check
│   │   ├── git.ts                # Git operations (submodules)
│   │   ├── deployment.ts         # Deployment execution
│   │   └── artifacts.ts          # Parse deployment artifacts
│   └── templates/                # Configuration templates
│       ├── foundry.toml.template
│       ├── hardhat.config.template.ts
│       └── env.template
│
├── packages/
│   ├── foundry/                  # NEW: Foundry smart contracts package
│   │   ├── contracts/            # Symlink or copy from Testnet/Playground
│   │   ├── script/               # Deployment scripts
│   │   ├── test/                 # Test files
│   │   ├── lib/                  # Dependencies (forge-std, oz)
│   │   ├── foundry.toml
│   │   ├── Makefile
│   │   └── package.json
│   │
│   ├── hardhat/                  # NEW: Hardhat smart contracts package
│   │   ├── contracts/            # Symlink or copy from Testnet/Playground
│   │   ├── deploy/               # Hardhat-deploy scripts
│   │   ├── test/                 # Test files
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   │
│   └── nextjs/                   # EXISTING: Frontend (moved from frontend/)
│       ├── src/
│       │   ├── app/              # Next.js pages
│       │   ├── components/       # React components
│       │   ├── hooks/            # Custom hooks
│       │   ├── lib/              # Utilities
│       │   └── contracts/        # Generated ABIs (auto-updated)
│       ├── package.json
│       └── ...
│
├── contracts-source/             # NEW: Contract sources management
│   ├── testnet/                  # Symlink to ../Testnet-Contracts/src
│   └── playground/               # Symlink to ../Playground-Contracts/src
│
├── scripts/                      # Build and utility scripts
│   ├── check-env.js
│   ├── sync-contracts.ts         # Sync contracts to packages
│   └── generate-abis.ts          # Generate TypeScript ABIs
│
├── package.json                  # Root package.json (workspaces)
├── tsconfig.json
└── .env.example
```

---

## Implementation Steps

### Phase 1: Project Restructuring

#### 1.1 Initialize Git Branch
```bash
cd scaffold-evvm
git checkout -b newscaffoldevvm
```

#### 1.2 Create Monorepo Structure
- Update root `package.json` with workspaces
- Move `frontend/` to `packages/nextjs/`
- Create `packages/foundry/` and `packages/hardhat/` directories
- Create `cli/` directory structure

#### 1.3 Update Dependencies
Root `package.json` should include:
```json
{
  "name": "scaffold-evvm",
  "version": "3.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "cli": "tsx cli/index.ts",
    "wizard": "tsx cli/index.ts",
    "init": "tsx cli/index.ts init",
    "deploy": "tsx cli/index.ts deploy",
    "chain": "tsx cli/index.ts chain",
    "dev": "yarn workspace @scaffold-evvm/nextjs dev",
    "build": "yarn workspace @scaffold-evvm/nextjs build",
    "start": "yarn workspace @scaffold-evvm/nextjs start",
    "foundry:test": "yarn workspace @scaffold-evvm/foundry test",
    "foundry:deploy": "yarn workspace @scaffold-evvm/foundry deploy",
    "hardhat:test": "yarn workspace @scaffold-evvm/hardhat test",
    "hardhat:deploy": "yarn workspace @scaffold-evvm/hardhat deploy"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "chalk": "^5.3.0",
    "prompts": "^2.4.2",
    "execa": "^8.0.1",
    "viem": "^2.39.0"
  }
}
```

### Phase 2: CLI Wizard Implementation

#### 2.1 Main CLI Entry Point (`cli/index.ts`)
```typescript
#!/usr/bin/env node
import { init } from './commands/init';
import { deploy } from './commands/deploy';
import { chain } from './commands/chain';
import { showBanner, parseArgs } from './utils';

async function main() {
  showBanner();
  const command = parseArgs();

  switch(command) {
    case 'init': await init(); break;
    case 'deploy': await deploy(); break;
    case 'chain': await chain(); break;
    default: await interactiveWizard(); break;
  }
}
```

#### 2.2 Framework Selection Prompt
```typescript
// cli/prompts/framework.ts
const frameworkPrompt = {
  type: 'select',
  name: 'framework',
  message: 'Select your smart contract framework:',
  choices: [
    {
      title: 'Foundry',
      value: 'foundry',
      description: 'Fast, Solidity-native testing with Forge'
    },
    {
      title: 'Hardhat',
      value: 'hardhat',
      description: 'JavaScript/TypeScript ecosystem with plugins'
    }
  ]
};
```

#### 2.3 Contract Source Selection
```typescript
// cli/prompts/contracts.ts
const contractsPrompt = {
  type: 'select',
  name: 'contractSource',
  message: 'Select contract source:',
  choices: [
    {
      title: 'Testnet Contracts',
      value: 'testnet',
      description: 'Production-ready contracts for testnet deployment'
    },
    {
      title: 'Playground Contracts',
      value: 'playground',
      description: 'Experimental contracts for prototyping'
    }
  ]
};
```

#### 2.4 Network Configuration
```typescript
// cli/prompts/network.ts
const networkPrompt = {
  type: 'select',
  name: 'network',
  message: 'Select deployment network:',
  choices: [
    { title: 'Local (Anvil/Hardhat)', value: 'localhost' },
    { title: 'Ethereum Sepolia', value: 'eth-sepolia' },
    { title: 'Arbitrum Sepolia', value: 'arb-sepolia' },
    { title: 'Custom RPC', value: 'custom' }
  ]
};
```

### Phase 3: Foundry Package Setup

#### 3.1 Create `packages/foundry/package.json`
```json
{
  "name": "@scaffold-evvm/foundry",
  "version": "1.0.0",
  "scripts": {
    "chain": "anvil --block-time 10",
    "compile": "forge build --via-ir",
    "test": "forge test -vvv",
    "deploy": "node scripts/deploy.js",
    "deploy:local": "forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast",
    "deploy:sepolia": "forge script script/Deploy.s.sol --rpc-url $RPC_URL_ETH_SEPOLIA --account defaultKey --broadcast --verify"
  }
}
```

#### 3.2 Create Foundry Deployment Script
Adapt from Testnet-Contracts `DeployTestnet.s.sol`:
- Dynamic contract loading based on selected source
- ABI export for frontend integration
- Deployment artifact parsing

#### 3.3 Sync Script for Contract Sources
```typescript
// scripts/sync-contracts.ts
// Copies/symlinks contracts from Testnet-Contracts or Playground-Contracts
// Based on user selection during init
```

### Phase 4: Hardhat Package Setup

#### 4.1 Create `packages/hardhat/package.json`
```json
{
  "name": "@scaffold-evvm/hardhat",
  "version": "1.0.0",
  "scripts": {
    "chain": "hardhat node --no-deploy",
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "ts-node scripts/deploy.ts",
    "deploy:local": "hardhat deploy --network localhost",
    "deploy:sepolia": "hardhat deploy --network sepolia"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-foundry": "^1.1.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0",
    "hardhat-deploy": "^0.12.0"
  }
}
```

#### 4.2 Hardhat Configuration
```typescript
// packages/hardhat/hardhat.config.ts
import "@nomicfoundation/hardhat-foundry"; // Bridge for lib/ dependencies
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: { enabled: true, runs: 300 },
      viaIR: true
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: {
      url: process.env.RPC_URL_ETH_SEPOLIA,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
```

### Phase 5: Frontend Integration

#### 5.1 Move and Update Frontend
- Move `frontend/` to `packages/nextjs/`
- Update import paths
- Add contracts directory for generated ABIs

#### 5.2 Create ABI Generation Script
```typescript
// scripts/generate-abis.ts
// After deployment, extracts ABIs from:
// - Foundry: out/*.json
// - Hardhat: artifacts/*.json
// Generates packages/nextjs/src/contracts/deployedContracts.ts
```

#### 5.3 Update Frontend Hooks
```typescript
// packages/nextjs/src/hooks/useDeployedContracts.ts
import deployedContracts from '../contracts/deployedContracts';
// Auto-discover EVVM, Staking, Treasury, etc. from deployment
```

### Phase 6: Unified Deployment Flow

#### 6.1 Full Wizard Flow
```
1. Show EVVM Banner
2. Check Prerequisites (Node, Git, Foundry/Hardhat)
3. Select Framework: Foundry | Hardhat
4. Select Contracts: Testnet | Playground
5. Initialize dependencies (git submodules / npm install)
6. Configure EVVM:
   - Admin addresses (admin, goldenFisher, activator)
   - Token metadata (name, symbol, supply)
7. Select Network: Local | Sepolia | Arbitrum | Custom
8. Select/Import Wallet
9. Deploy Contracts
10. Parse Artifacts & Generate Frontend ABIs
11. (Optional) Register with Registry EVVM
12. Display Summary with Explorer Links
13. Start Frontend (optional)
```

#### 6.2 Command Reference
| Command | Description |
|---------|-------------|
| `yarn wizard` | Interactive full wizard |
| `yarn init` | Initialize project (framework + contracts) |
| `yarn chain` | Start local blockchain |
| `yarn deploy` | Deploy contracts |
| `yarn dev` | Start frontend dev server |
| `yarn foundry:test` | Run Foundry tests |
| `yarn hardhat:test` | Run Hardhat tests |

---

## File Changes Summary

### New Files
- `cli/index.ts` - Main CLI entry
- `cli/commands/*.ts` - CLI commands (init, deploy, chain, config)
- `cli/prompts/*.ts` - Interactive prompts
- `cli/utils/*.ts` - Utility functions
- `packages/foundry/*` - Foundry package
- `packages/hardhat/*` - Hardhat package
- `scripts/sync-contracts.ts` - Contract sync utility
- `scripts/generate-abis.ts` - ABI generator

### Modified Files
- `package.json` - Convert to monorepo with workspaces
- `frontend/` → `packages/nextjs/` - Move and update

### Dependencies to Add
- `tsx` - TypeScript execution
- `chalk` - Terminal colors
- `prompts` - Interactive CLI prompts
- `execa` - Shell command execution
- `viem` - Ethereum interactions
- Foundry/Hardhat packages as needed

---

## Success Criteria

1. **Framework Flexibility**: Users can choose Foundry or Hardhat seamlessly
2. **Contract Source Flexibility**: Easy switch between Testnet and Playground contracts
3. **Zero-Config Deployment**: Wizard handles all configuration
4. **Frontend Integration**: Automatic ABI updates after deployment
5. **Developer Experience**: Single command to go from zero to deployed EVVM
6. **Backward Compatibility**: Existing signature constructor functionality preserved

---

## Timeline Estimate

- Phase 1 (Restructuring): Foundation setup
- Phase 2 (CLI Wizard): Core wizard implementation
- Phase 3 (Foundry): Foundry package integration
- Phase 4 (Hardhat): Hardhat package integration
- Phase 5 (Frontend): Frontend updates and ABI generation
- Phase 6 (Integration): End-to-end testing and polish

---

## Next Steps

1. Create `newscaffoldevvm` branch
2. Initialize monorepo structure
3. Implement CLI wizard core
4. Integrate Foundry package
5. Integrate Hardhat package
6. Connect frontend with deployment artifacts
7. Test full deployment flow
8. Documentation and refinement
