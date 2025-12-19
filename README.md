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

### Prerequisites

- Node.js 18+ and npm
- Git
- Foundry (recommended) - Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Recommended Workflow (Two Terminals)

This is the recommended way to develop with Scaffold-EVVM:

**Terminal 1: Deploy Contracts**
```bash
# Clone and install
git clone <your-repo-url>
cd scaffold-evvm
npm install

# Deploy contracts (interactive wizard)
npm run cli deploy
```

**Terminal 2: Start Frontend**
```bash
npm run frontend
```

The `npm run cli deploy` command will:
1. Check for latest contract updates from GitHub
2. Select framework (Foundry/Hardhat)
3. Select contracts (Testnet/Playground)
4. Configure EVVM (admin addresses, token metadata)
5. Sync and compile contracts
6. Select network (Local/Sepolia/Arbitrum)
7. Deploy contracts
8. Register with EVVM Registry (optional)
9. Update frontend configuration

### Troubleshooting

If you encounter bugs or errors:
```bash
npm run cli flush   # Clear all caches, stop local chains, and kill servers
npm run cli deploy  # Re-deploy contracts
npm run frontend    # Start frontend fresh
```

#### Common Local Deployment Issues

**Nonce errors (e.g., "Nonce too high", "Nonce too low")**

This happens when Anvil or Hardhat Network has stale state from previous deployments:
```bash
npm run cli flush   # Stops Anvil/Hardhat and clears all caches
npm run cli deploy  # Fresh deployment with new chain instance
```

**Port 8545 already in use**

A previous local chain is still running:
```bash
npm run cli flush   # Automatically kills processes on port 8545
```

**Transaction reverted / deployment failed**

The local chain state may be corrupted:
```bash
npm run cli flush   # Complete reset of local environment
npm run cli deploy  # Start fresh
```

The `npm run cli flush` command:
- Stops all Anvil instances
- Stops all Hardhat Network instances
- Clears port 8545
- Clears Next.js cache
- Clears Foundry cache and build artifacts
- Clears Hardhat cache and artifacts

### Alternative: All-in-One Command

```bash
npm run start:full  # Full setup + deploy + frontend in one command
```

This runs everything including the frontend in a single terminal. Use this for quick demos, but the two-terminal workflow is better for development.

---

## Current Status

### Fully Working Flows

All framework and contract combinations are fully tested and working:

| Framework | Contracts | Network | Status |
|-----------|-----------|---------|--------|
| Foundry | Testnet-Contracts | Ethereum Sepolia | ✅ Working |
| Foundry | Testnet-Contracts | Arbitrum Sepolia | ✅ Working |
| Foundry | Testnet-Contracts | Local (Anvil) | ✅ Working |
| Foundry | Playground-Contracts | Ethereum Sepolia | ✅ Working |
| Foundry | Playground-Contracts | Arbitrum Sepolia | ✅ Working |
| Foundry | Playground-Contracts | Local (Anvil) | ✅ Working |
| Hardhat | Testnet-Contracts | Ethereum Sepolia | ✅ Working |
| Hardhat | Testnet-Contracts | Arbitrum Sepolia | ✅ Working |
| Hardhat | Testnet-Contracts | Local (Hardhat Network) | ✅ Working |
| Hardhat | Playground-Contracts | Ethereum Sepolia | ✅ Working |
| Hardhat | Playground-Contracts | Arbitrum Sepolia | ✅ Working |
| Hardhat | Playground-Contracts | Local (Hardhat Network) | ✅ Working |

**Features verified:**
- Contract deployment with all 6 contracts (EVVM, Staking, Estimator, NameService, Treasury, P2PSwap)
- Automatic contract verification on block explorers (Etherscan/Arbiscan)
- EVVM Registry registration with cross-chain support
- Frontend configuration auto-update
- `npm run cli flush` for troubleshooting

**Tested workflow:**
```bash
npm run cli deploy      # Select: Foundry/Hardhat → Testnet/Playground → Network → Configure EVVM
npm run frontend        # Start frontend in separate terminal
npm run cli flush       # Use when encountering issues
```

### In Development

Currently being developed:

- **Additional network support** - Planned

---

## Framework Comparison

### Foundry vs Hardhat

| Feature | Foundry | Hardhat |
|---------|---------|---------|
| Local Chain | Anvil | Hardhat Network |
| Wallet Management | Keystore (encrypted) | Private key in `.env` |
| Compilation | `forge build` | `forge build` (hybrid) |
| Test Framework | Solidity tests | JavaScript/TypeScript tests |
| Speed | Faster | Moderate |

### Wallet Management

> **Best Practice:** Always use **dedicated testing wallets** for development and testnet deployments. Do not use the default Anvil/Hardhat test accounts for anything beyond local development. Create separate wallets without real funds for testing purposes.

**Foundry (Keystore - Recommended)**
```bash
# Create a new testing wallet (recommended)
cast wallet new

# Import an existing testing wallet securely (encrypted on disk)
cast wallet import deployer --interactive

# List available wallets
cast wallet list

# Wallet is stored encrypted in ~/.foundry/keystores/
```

**Why use keystore?**
- Private key is encrypted with your password
- Stored securely in `~/.foundry/keystores/`
- Never exposed in plain text or command history
- Works seamlessly with the CLI deploy wizard

**Hardhat (Private Key)**
```bash
# Add to .env file (less secure, but simpler)
DEPLOYER_PRIVATE_KEY=0x...your_private_key_here...
```

> **Security Warning:**
> - Foundry's keystore encrypts keys on disk - **recommended for all deployments**
> - Hardhat stores keys in plain text in `.env` - ensure `.env` is in `.gitignore`
> - **Never** use wallets containing real funds for testing
> - **Never** commit `.env` files to version control
> - Create dedicated wallets for testnet deployments

---

## Local Development

### Foundry Local (Anvil)

For Foundry framework, the CLI uses **Anvil** as the local development chain.

**Automatic (recommended):**
```bash
npm run cli deploy   # Select Foundry → "Local" → CLI starts Anvil automatically
```

**Manual (two terminals):**
```bash
# Terminal 1: Start Anvil
anvil --port 8545 --chain-id 31337

# Terminal 2: Deploy and run frontend
npm run cli deploy   # Select "Local" → "I'll start Anvil manually"
npm run frontend
```

**Anvil logs:** `anvil.log` in project root

### Hardhat Local (Hardhat Network)

For Hardhat framework, the CLI uses **Hardhat Network** as the local development chain.

**Automatic (recommended):**
```bash
npm run cli deploy   # Select Hardhat → "Local" → CLI starts Hardhat Network automatically
```

**Manual (two terminals):**
```bash
# Terminal 1: Start Hardhat Network
cd packages/hardhat && npx hardhat node

# Terminal 2: Deploy and run frontend
npm run cli deploy   # Select "Local" → "I'll start Hardhat Network manually"
npm run frontend
```

**Hardhat logs:** `hardhat-node.log` in project root

### Local Chain Configuration (Both Frameworks)

Both Anvil and Hardhat Network use the same configuration:
- **Port:** 8545
- **Chain ID:** 31337
- **Test Mnemonic:** `test test test test test test test test test test test junk`

**Important notes for local development:**
- **WalletConnect does NOT work with localhost** - You must configure your wallet manually
- Add local network to MetaMask/Rabby: RPC `http://127.0.0.1:8545`, Chain ID `31337`
- Import test account: Private Key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Test account address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Test account balance: 10,000 ETH

> **Warning:** The default test account above is for **local development only**. These keys are publicly known and should never be used on any network with real value. For testnet deployments, always create and use your own dedicated testing wallet.

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

### Main Commands (Recommended)

```bash
npm run cli deploy      # Full deployment wizard (checks GitHub, configures, deploys)
npm run frontend        # Start Next.js frontend dev server
npm run cli flush       # Clear all caches and stop servers (use when troubleshooting)
```

### Workflow

```bash
# Terminal 1: Deploy
npm run cli deploy      # Interactive: GitHub check → config → deploy → registry

# Terminal 2: Frontend
npm run frontend        # Start frontend (after deployment)

# If errors occur:
npm run cli flush       # Clear caches
npm run cli deploy      # Re-deploy
npm run frontend        # Restart frontend
```

### Other CLI Commands

```bash
npm run wizard          # Alias for interactive setup
npm run start:full      # All-in-one: deploy + frontend (single terminal)
npm run cli chain       # Start local chain only (Anvil/Hardhat)
npm run cli sources     # Check/update contract source repositories
npm run cli config      # Update EVVM configuration only
```

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

### Contract Source Management

```bash
npm run sources         # Interactive: check, clone, or update contract repos
npm run check-sources   # Same as above (alias)
```

The CLI automatically checks for contract source updates before deployment:
- Fetches latest from remote to compare versions
- Prompts to clone if repositories are missing
- Warns if local repos are behind remote

### Utilities

```bash
npm run sync-contracts  # Sync from Testnet/Playground to packages/
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

# Deployment RPC URLs (optional - uses fallback RPCs if not set)
RPC_URL_ETH_SEPOLIA=https://1rpc.io/sepolia
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
ETHERSCAN_API=your_etherscan_api_key

# Hardhat Deployment (REQUIRED for Hardhat framework on testnets)
# For Foundry, use keystore instead: cast wallet import deployer --interactive
DEPLOYER_PRIVATE_KEY=0x...your_private_key_here...
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

### Best Practices

1. **Use dedicated testing wallets** - Create wallets specifically for development and testnet use
2. **Never use real funds** - Testing wallets should only hold testnet tokens
3. **Use Foundry keystore** - Encrypted private key storage is more secure than plain text
4. **Never commit secrets** - Keep `.env` files out of version control
5. **All signing is client-side** - The frontend never sends private keys anywhere

### Wallet Security Comparison

| Framework | Storage | Security Level | Recommendation |
|-----------|---------|----------------|----------------|
| Foundry | Encrypted keystore in `~/.foundry/keystores/` | High - password protected | **Recommended** |
| Hardhat | Plain text in `.env` file | Medium - relies on file permissions | Use for convenience only |

### Foundry Keystore (Recommended)

```bash
# Create a new testing wallet
cast wallet new

# Save the private key, then import it with a password
cast wallet import my-testnet-wallet --interactive

# List your wallets
cast wallet list

# The wallet is now encrypted and stored in ~/.foundry/keystores/
```

The CLI deploy wizard automatically detects your Foundry keystores and prompts for the password when deploying.

### What NOT to do

- Do NOT use the default Anvil/Hardhat test account (`0xf39...`) on testnets
- Do NOT store real funds in testing wallets
- Do NOT commit `.env` files with private keys
- Do NOT share your keystore password

> **Note:** Contracts in this repository are not audited for mainnet use. Use on mainnet at your own risk.

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
