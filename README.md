# Scaffold-EVVM

**The complete local development and deployment environment for EVVM (Ethereum Virtual Virtual Machine) ecosystem.**

EVVM is a virtual blockchain system that runs on existing blockchains, giving you your own blockchain without managing infrastructure. Deploy without validators or nodes, inherit security from underlying blockchains, and launch rapidly.

Scaffold-EVVM is your all-in-one toolkit for deploying, interacting with, and building services on EVVM. Choose between Foundry or Hardhat, deploy production-ready contracts from Testnet-Contracts or experimental ones from Playground-Contracts, and use the integrated frontend to construct and execute EVVM signatures.

---

## Features

- **Dual Framework Support** - Choose Foundry or Hardhat for smart contract development
- **Dual Contract Sources** - Deploy from Testnet-Contracts (production) or Playground-Contracts (experimental)
- **Interactive CLI Wizard** - Guided setup for framework, contracts, and configuration
- **Local Development Focus** - Deploy to local chains (Anvil/Hardhat Network) for rapid iteration
- **Prerequisite Validation** - Automatic checks for Node.js 18+, Git, Foundry, and dependencies
- **Deployment Summary** - Comprehensive output saved to `deployments/`
- **Auto Config Sync** - Frontend automatically detects and loads new deployments
- **Signature Constructor Frontend** - 23+ signature constructors for all EVVM operations
- **Auto Contract Discovery** - Discovers Staking, NameService, Estimator from EVVM core
- **Meta-Transaction Pattern** - EIP-191 gasless signatures submitted by executors

> **Note:** This version supports **local deployment only**. Testnet deployment (Ethereum Sepolia, Arbitrum Sepolia) will be available in a future release.

---

## Quick Start

### Fresh Clone Experience

Any user can clone, install, and deploy locally:

```bash
git clone https://github.com/EVVM-org/scaffold-evvm.git
cd scaffold-evvm
npm install
npm run cli deploy
```

The `npm run cli deploy` wizard will:
1. **Check prerequisites** → Validate Node.js 18+, Git, Foundry/Hardhat
2. **Detect missing contract sources** → Prompt to clone Testnet-Contracts or Playground-Contracts
3. **Clone inside project** → `./Testnet-Contracts` or `./Playground-Contracts`
4. **Initialize git submodules** automatically
5. **Guide you through deployment** → Select framework, contracts, and configure EVVM
6. **Start local chain** → Anvil (Foundry) or Hardhat Network
7. **Deploy contracts** → All 6 EVVM contracts deployed locally
8. **Update frontend** → Automatically configure `.env` with contract addresses

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | Required for CLI and frontend |
| **npm** | Latest | Package manager |
| **Git** | Latest | For cloning contract sources |
| **Foundry** | Latest | For Foundry framework (`foundryup`) |

> **Tip:** For local deployment, everything is fully automated - no wallet setup needed since test accounts are used.

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

### Recommended Workflow (Two Terminals)

This is the recommended way to develop with Scaffold-EVVM:

**Terminal 1: Deploy Contracts**
```bash
npm run cli deploy
```

**Terminal 2: Start Frontend**
```bash
npm run frontend
```

The `npm run cli deploy` command will:
1. Check prerequisites (Node.js, Git, Foundry/Hardhat)
2. Check for latest contract updates from GitHub
3. Select framework (Foundry/Hardhat)
4. Select contracts (Testnet/Playground)
5. Configure EVVM (admin addresses, token metadata)
6. Sync and compile contracts
7. Start local chain (Anvil/Hardhat Network)
8. Deploy contracts
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

### Supported Deployment Flows

This version supports **local deployment only**:

| Framework | Contracts | Network | Status |
|-----------|-----------|---------|--------|
| Foundry | Testnet-Contracts | Local (Anvil) | ✅ Working |
| Foundry | Playground-Contracts | Local (Anvil) | ✅ Working |
| Hardhat | Testnet-Contracts | Local (Hardhat Network) | ✅ Working |
| Hardhat | Playground-Contracts | Local (Hardhat Network) | ✅ Working |

**Features verified:**
- Prerequisite validation (Node.js 18+, Git, Foundry/Hardhat)
- Contract source detection and cloning
- Contract deployment with all 6 contracts (EVVM, Staking, Estimator, NameService, Treasury, P2PSwap)
- Local chain management (Anvil/Hardhat Network)
- Frontend configuration auto-update
- `npm run cli flush` for troubleshooting

**Tested workflow:**
```bash
npm run cli deploy      # Select: Foundry/Hardhat → Testnet/Playground → Configure EVVM → Deploy locally
npm run frontend        # Start frontend in separate terminal
npm run cli flush       # Use when encountering issues
```

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
│   ├── commands/           # CLI commands (deploy, start, flush, sources)
│   └── utils/              # CLI utilities and display helpers
├── Testnet-Contracts/      # Cloned EVVM production contracts (git clone)
├── Playground-Contracts/   # Cloned EVVM experimental contracts (git clone)
├── deployments/            # Deployment summaries (JSON)
│   ├── latest.json         # Most recent deployment
│   └── deployment-{network}-{chainId}.json
├── packages/
│   ├── foundry/            # Foundry package (uses contracts from source repos)
│   ├── hardhat/            # Hardhat package (uses contracts from source repos)
│   └── nextjs/             # Frontend application
│       ├── src/app/        # Next.js pages
│       ├── src/components/ # Signature constructors
│       ├── src/hooks/      # React hooks
│       └── src/lib/        # Utilities
├── input/                  # EVVM configuration files (generated by CLI)
└── scaffold.config.json    # Project configuration
```

> **Note:** Contract source repositories (`Testnet-Contracts/`, `Playground-Contracts/`) are cloned inside the project by the CLI wizard. They are gitignored and not part of the scaffold-evvm repository.

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
NEXT_PUBLIC_CHAIN_ID=31337  # Local chain ID

# Contract Addresses (auto-populated by CLI)
NEXT_PUBLIC_STAKING_ADDRESS=0x...
NEXT_PUBLIC_ESTIMATOR_ADDRESS=0x...
NEXT_PUBLIC_NAMESERVICE_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_P2PSWAP_ADDRESS=0x...

# Config Version (for auto-sync with frontend)
NEXT_PUBLIC_CONFIG_VERSION=1702345678901
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
    "name": "Local Chain",
    "chainId": 31337,
    "network": "localhost"
  },
  "evvm": {
    "address": "0x9f736cc2c759fa91b5a34dcdc46bf0ed7c69470c"
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

| Network | Chain ID | RPC |
|---------|----------|-----|
| Local (Anvil/Hardhat) | 31337 | http://localhost:8545 |

> **Note:** This version supports local development only. Testnet support (Ethereum Sepolia, Arbitrum Sepolia) will be available in a future release.

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

EVVM (Ethereum Virtual Virtual Machine) is a virtual blockchain system that runs on existing blockchains, giving you your own blockchain without managing infrastructure. Key capabilities:

- **No Infrastructure Required** - Deploy without validators or nodes
- **Inherited Security** - Leverages underlying blockchain security
- **Rapid Launch** - Multiple EVVMs can operate on a single host blockchain
- **Gasless Communication** - Transactions via APIs or messaging systems instead of traditional blockchain pathways

### Core Contracts

The system comprises six main components:

1. **Evvm** - Core contract managing payments and tokens using EIP-191 signatures
2. **Staking** - Era-based rewards for MATE token holders (golden, presale, public tiers)
3. **Estimator** - Staking rewards calculation engine
4. **NameService** - Human-readable identities through username registration
5. **Treasury** - Cross-chain asset management and transfers
6. **P2PSwap** - Decentralized peer-to-peer token exchange

### Meta-Transaction Flow (Gasless Operations)

```
1. User signs message off-chain (no gas cost)
2. Message broadcast to "fishing spots" (mempools, APIs, or communication channels)
3. Fishers (operators) capture, validate, and submit transactions on-chain
4. Contract verifies signature and executes
5. User receives result without paying gas
```

### Dual Nonce System

- **Sync Nonces** - Sequential counters enforcing transaction order
- **Async Nonces** - User-defined, allowing parallel processing

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
