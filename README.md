# Scaffold-EVVM

**The complete development environment for EVVM (Ethereum Virtual Virtual Machine) ecosystem.**

Scaffold-EVVM is your all-in-one toolkit for deploying, interacting with, and building services on EVVM. Choose between Foundry or Hardhat, deploy production-ready contracts from Testnet-Contracts or experimental ones from Playground-Contracts, and use the integrated frontend to construct and execute EVVM signatures.

---

## Features

- **Dual Framework Support** - Choose Foundry or Hardhat for smart contract development
- **Dual Contract Sources** - Deploy from Testnet-Contracts (production) or Playground-Contracts (experimental)
- **Interactive CLI Wizard** - Guided setup for framework, contracts, and configuration
- **Full Deployment Pipeline** - Deploy to local chains, Ethereum Sepolia, or Arbitrum Sepolia
- **Fallback RPC Support** - Automatic RPC failover with 9+ endpoints per network
- **Deployment Summary** - Comprehensive output with explorer links saved to `deployments/`
- **Auto Config Sync** - Frontend automatically detects and loads new deployments
- **Signature Constructor Frontend** - 23+ signature constructors for all EVVM operations
- **Auto Contract Discovery** - Discovers Staking, NameService, Estimator from EVVM core
- **Meta-Transaction Pattern** - EIP-191 gasless signatures submitted by executors
- **Registry Integration** - Register your EVVM instance in the global registry

---

## Quick Start

### One Command Setup

```bash
# Clone and install
git clone <your-repo-url>
cd scaffold-evvm
npm install

# Full setup in ONE command:
npm run start:full
```

This single command will:
1. Select framework (Foundry/Hardhat)
2. Select contracts (Testnet/Playground)
3. Configure EVVM (addresses, metadata)
4. Sync and compile contracts
5. Start local chain (if localhost)
6. Deploy contracts
7. Register with EVVM Registry (optional)
8. Update frontend configuration
9. Start the frontend

### Prerequisites

- Node.js 18+ and npm
- Git
- Foundry (recommended) - Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Alternative: Interactive Wizard

```bash
npm run wizard    # Step-by-step interactive setup
```

### Wizard Flow

The wizard guides you through:

1. **Framework Selection** - Foundry (fast, Solidity-native) or Hardhat (JS/TS ecosystem)
2. **Contract Source** - Testnet-Contracts or Playground-Contracts
3. **EVVM Configuration** - Admin addresses and token metadata
4. **Network Selection** - Local, Sepolia, Arbitrum, or custom RPC
5. **Deployment** - Automatic contract deployment and verification
6. **Registry Registration** - Optional global EVVM registry enrollment

---

## Project Structure

```
scaffold-evvm/
├── cli/                    # Interactive CLI wizard
│   ├── commands/           # CLI commands (init, deploy, chain, config, start, flush)
│   └── utils/              # CLI utilities and display helpers
├── deployments/            # Deployment summaries (JSON)
│   ├── latest.json         # Most recent deployment
│   └── deployment-{network}-{chainId}.json
├── packages/
│   ├── foundry/            # Foundry smart contracts package
│   │   ├── contracts/      # Synced from Testnet/Playground
│   │   ├── script/         # Deployment scripts
│   │   └── broadcast/      # Deployment artifacts
│   ├── hardhat/            # Hardhat smart contracts package
│   │   ├── contracts/      # Synced from Testnet/Playground
│   │   ├── deploy/         # Hardhat-deploy scripts
│   │   └── deployments/    # Deployment artifacts
│   └── nextjs/             # Frontend application
│       ├── src/app/        # Next.js pages
│       ├── src/components/ # Signature constructors
│       ├── src/hooks/      # React hooks
│       └── src/lib/        # Utilities
├── scripts/                # Build utilities
├── input/                  # EVVM configuration files
└── scaffold.config.json    # Project configuration
```

---

## Commands

### Wizard & CLI

```bash
npm run wizard          # Interactive setup wizard
npm run start:full      # Full setup + deploy + frontend in one command
npm run cli init        # Initialize project
npm run cli deploy      # Deploy contracts only
npm run cli chain       # Start local chain
npm run cli config      # Update configuration
npm run cli flush       # Clear all caches and stop servers
```

### Separate Deploy & Frontend (Recommended for Development)

```bash
# Terminal 1: Deploy contracts
npm run cli deploy      # Deploy and register with EVVM Registry

# Terminal 2: Start frontend (after deployment)
npm run flush           # Clear caches (if needed)
npm run frontend        # Start Next.js dev server
```

This workflow allows you to:
- Keep the deployment terminal open for logs
- Restart the frontend independently after config changes
- Clear caches without redeploying

### Framework Commands

```bash
# Foundry
npm run foundry:chain   # Start Anvil local chain
npm run foundry:compile # Compile with Forge
npm run foundry:test    # Run Foundry tests
npm run foundry:deploy  # Deploy with Foundry

# Hardhat
npm run hardhat:chain   # Start Hardhat Network
npm run hardhat:compile # Compile with Hardhat
npm run hardhat:test    # Run Hardhat tests
npm run hardhat:deploy  # Deploy with Hardhat
```

### Frontend

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
```

### Utilities

```bash
npm run sync-contracts  # Sync from Testnet/Playground
npm run generate-abis   # Generate ABIs for frontend
npm run flush           # Clear all caches and stop frontend server
npm run frontend        # Start frontend server (alias for npm run dev)
```

---

## Configuration

### Environment Variables (.env)

The CLI automatically updates `.env` after deployment with all contract addresses:

```bash
# Frontend Configuration
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_EVVM_ADDRESS=0x...deployed_evvm_address
NEXT_PUBLIC_CHAIN_ID=11155111  # or 421614 for Arbitrum
NEXT_PUBLIC_EVVM_ID=1234       # Assigned after registry registration

# Contract Addresses (auto-populated by CLI)
NEXT_PUBLIC_STAKING_ADDRESS=0x...
NEXT_PUBLIC_ESTIMATOR_ADDRESS=0x...
NEXT_PUBLIC_NAMESERVICE_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_P2PSWAP_ADDRESS=0x...

# Config Version (for auto-sync with frontend)
NEXT_PUBLIC_CONFIG_VERSION=1702345678901

# Deployment RPC URLs
RPC_URL_ETH_SEPOLIA=https://1rpc.io/sepolia
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
ETHERSCAN_API=your_etherscan_api_key

# Hardhat (optional)
DEPLOYER_PRIVATE_KEY=0x...
```

### EVVM Configuration (input/)

Configuration files are generated by the wizard:

- `address.json` - Admin, Golden Fisher, Activator addresses
- `evvmBasicMetadata.json` - EVVM name, token name, symbol
- `evvmAdvancedMetadata.json` - Supply, era tokens, reward

### Deployment Output (deployments/)

After deployment, a summary is saved:

```json
{
  "network": {
    "name": "Ethereum Sepolia",
    "chainId": 11155111,
    "network": "eth-sepolia"
  },
  "evvm": {
    "id": 1101,
    "address": "0x9f736cc2c759fa91b5a34dcdc46bf0ed7c69470c",
    "explorer": "https://sepolia.etherscan.io/address/0x..."
  },
  "contracts": {
    "evvm": "0x...",
    "staking": "0x...",
    "estimator": "0x...",
    "nameService": "0x...",
    "treasury": "0x...",
    "p2pSwap": "0x..."
  },
  "deployment": {
    "timestamp": "2024-12-15T10:30:00.000Z",
    "timestampUnix": 1702636200000
  }
}
```

---

## Supported Networks

| Network | Chain ID | Primary RPC |
|---------|----------|-------------|
| Local (Anvil/Hardhat) | 31337 | http://localhost:8545 |
| Ethereum Sepolia | 11155111 | https://eth-sepolia.api.onfinality.io/public |
| Arbitrum Sepolia | 421614 | https://sepolia-rollup.arbitrum.io/rpc |

### Fallback RPC Endpoints

The CLI includes automatic failover to backup RPCs if the primary fails:

**Ethereum Sepolia** (ordered by latency):
| Provider | RPC URL | Latency |
|----------|---------|---------|
| OnFinality | https://eth-sepolia.api.onfinality.io/public | ~60ms |
| 1RPC | https://1rpc.io/sepolia | ~109ms |
| SubQuery | https://ethereum-sepolia.rpc.subquery.network/public | ~110ms |
| PublicNode | https://ethereum-sepolia-rpc.publicnode.com | ~172ms |
| Tenderly | https://sepolia.gateway.tenderly.co | ~172ms |
| dRPC | https://sepolia.drpc.org | ~216ms |
| Nodies | https://ethereum-sepolia-public.nodies.app | ~229ms |
| 0xRPC | https://0xrpc.io/sep | ~250ms |

**Arbitrum Sepolia** (ordered by latency):
| Provider | RPC URL | Latency |
|----------|---------|---------|
| Arbitrum Official | https://sepolia-rollup.arbitrum.io/rpc | ~134ms |
| Tenderly | https://arbitrum-sepolia.gateway.tenderly.co | ~161ms |
| Pocket | https://arbitrum-sepolia-testnet.api.pocket.network | ~174ms |
| PublicNode | https://arbitrum-sepolia-rpc.publicnode.com | ~236ms |
| Omnia | https://endpoints.omniatech.io/v1/arbitrum/sepolia/public | ~243ms |
| ZAN | https://api.zan.top/arb-sepolia | ~281ms |
| dRPC | https://arbitrum-sepolia.drpc.org | ~382ms |

---

## Contract Sources

### Testnet-Contracts

Production-ready EVVM contracts for testnet deployment:
- 6 core contracts: Evvm, Staking, Estimator, NameService, Treasury, P2PSwap
- Full test coverage
- Optimized for deployment

### Playground-Contracts

Experimental contracts for prototyping:
- Same 6 core contracts (development versions)
- Extensive unit and fuzz tests
- Ideal for testing new features

Sync contracts with:
```bash
npm run sync-contracts
```

---

## EVVM Core Concepts

### What is EVVM?

EVVM (Ethereum Virtual Virtual Machine) is a payment and identity system that uses meta-transactions (EIP-191 signatures) for gasless operations. Users sign messages off-chain, and executors ("fishers") submit transactions on-chain.

### Core Contracts

1. **Evvm** - Core payment system with dual-nonce meta-transactions
2. **Staking** - MATE token staking (golden, presale, public tiers)
3. **Estimator** - Staking rewards calculation
4. **NameService** - ENS-like identity system with offers and metadata
5. **Treasury** - Deposit/withdrawal management for ETH and ERC20
6. **P2PSwap** - Decentralized peer-to-peer token exchange

### Meta-Transaction Flow

```
1. User signs message off-chain (no gas cost)
2. Executor submits signed message on-chain
3. Contract verifies signature and executes
4. User receives result without paying gas
```

### Dual Nonce System

- **Sync Nonces** - Sequential, for ordered operations
- **Async Nonces** - Parallel, for independent operations

---

## EVVM Registry

All EVVM deployments should register with the global EVVM Registry on Ethereum Sepolia to receive an official EVVM ID.

**Registry Address:** `0x389dC8fb09211bbDA841D59f4a51160dA2377832`

The CLI handles registration automatically:
1. Calls `registerEvvm(chainId, evvmAddress)` on the Registry
2. Retrieves the assigned EVVM ID
3. Calls `setEvvmID(evvmId)` on your EVVM contract
4. Updates `.env` with the EVVM ID

Manual registration: https://www.evvm.info/registry

---

## Signature Constructors

The frontend includes 23+ signature constructors:

### Payment Operations
- `signPay` - Single payment
- `signDispersePay` - Multiple payments
- `signPayMultiple` - Batch payments

### Staking Operations
- `signGoldenStaking` - Golden fisher tier
- `signPresaleStaking` - Presale tier
- `signPublicStaking` - Public tier
- `signPublicServiceStaking` - Service tier

### NameService Operations
- `signPreRegistrationUsername` - Reserve username
- `signRegistrationUsername` - Register username
- `signMakeOffer` - Make offer
- `signAcceptOffer` - Accept offer
- `signRenewUsername` - Renew registration
- And more...

### P2PSwap Operations
- `signMakeOrder` - Create swap order
- `signCancelOrder` - Cancel order
- `signDispatchOrderFill` - Fill order

---

## Frontend Auto-Sync

The frontend automatically detects when the CLI updates the deployment configuration:

1. CLI writes `NEXT_PUBLIC_CONFIG_VERSION` timestamp to `.env`
2. Frontend compares timestamp with localStorage cache
3. If `.env` is newer, localStorage is cleared automatically
4. Fresh configuration loads from environment variables

This ensures the frontend always reflects the latest deployment without manual intervention.

---

## Development

### Adding a New Contract

1. Add contract to source repository (Testnet or Playground)
2. Run `npm run sync-contracts`
3. Update deployment script in `packages/foundry/script/` or `packages/hardhat/deploy/`
4. Run `npm run generate-abis` after compilation
5. Add frontend components in `packages/nextjs/src/components/`

### Testing

```bash
# Foundry tests
cd packages/foundry && forge test -vvv

# Hardhat tests
cd packages/hardhat && npx hardhat test

# Run specific test
forge test --match-test testFunctionName -vvv
```

---

## Documentation

- [EVVM Documentation](https://www.evvm.info/docs)
- [EVVM Signature Structures](https://www.evvm.org/docs/SignatureStructures/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Hardhat Docs](https://hardhat.org/docs)
- [@evvm/viem-signature-library](https://www.npmjs.com/package/@evvm/viem-signature-library)

---

## Security

- Never commit `.env` files with real keys
- All signing happens client-side
- Use Foundry keystore for secure key management: `cast wallet import deployer --interactive`
- Contracts not audited for mainnet use

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the commit message convention
4. Submit a pull request

---

Made for the EVVM ecosystem
