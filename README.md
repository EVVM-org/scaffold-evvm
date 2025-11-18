# ⚡ Scaffold-EVVM

A comprehensive testing & debugging framework for EVVM virtual blockchains. Similar in spirit to Scaffold-ETH 2, but tailored specifically for EVVM (Virtual EVM).

Built with **Next.js**, **TypeScript**, **viem**, and **Foundry**.

## 📖 What is EVVM?

EVVM (Virtual EVM) is an innovative blockchain virtualization system that allows you to create and deploy your own virtual blockchains on top of existing Ethereum networks. EVVM decouples blockchain logic from physical infrastructure, enabling:

- **Virtual Blockchain Infrastructure** running as smart contracts
- **Vertical Scalability** with multiple EVVMs on one host chain
- **Gasless Communication** via fishers and fishing spots
- **EIP-191 Signature Model** for all operations

## 🎯 What is Scaffold-EVVM?

Scaffold-EVVM provides a complete development environment for:

1. **Deploying** EVVM instances on testnets (Ethereum Sepolia, Arbitrum Sepolia) or locally (Anvil)
2. **Testing & Debugging** EVVM features including payments, staking, and name service
3. **Building** signatures using EIP-191 standard
4. **Executing** transactions and monitoring results

## ✨ Features

- 🔧 **One-Command Deployment**: Interactive wizard for EVVM deployment
- 🎨 **Clean UI**: Plain CSS, no frameworks - fast and simple
- 🔐 **Pure viem**: Direct blockchain interactions without abstraction layers
- 🐛 **Debug Console**: Real-time transaction monitoring and signature inspection
- 📝 **EIP-191 Signatures**: Built-in signature builders for all EVVM operations
- 🚀 **Hot Reload**: Contract changes reflect immediately in the frontend
- 🧪 **Local Development**: Test on Anvil before deploying to testnets

## 📋 Requirements

Before you begin, you need:

- [Node.js](https://nodejs.org/) v18 or higher
- [Foundry](https://getfoundry.sh/) (forge, cast, anvil)
- [Git](https://git-scm.com/)
- A Web3 wallet (MetaMask recommended) for testnet deployments

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd scaffold-evvm
npm install
```

This will install dependencies for both the contracts and frontend packages.

### 2. Initialize Git Submodules

The project uses EVVM Testnet-Contracts as a submodule:

```bash
cd contracts
git submodule update --init --recursive
```

### 3. Configure Environment

Create a `.env` file in the `contracts/` directory:

```bash
cd contracts
cp .env.example .env
```

Edit `.env` and add your RPC URLs and API keys:

```env
RPC_URL_ETH_SEPOLIA=https://0xrpc.io/sep
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
ETHERSCAN_API=your_etherscan_api_key
```

### 4. Import Wallet (for testnet deployment)

```bash
cast wallet import defaultKey --interactive
```

This securely stores your private key encrypted locally.

### 5. Deploy EVVM

Choose one of the following:

#### Option A: Deploy to Local Anvil (Recommended for Testing)

```bash
# Terminal 1: Start local blockchain
npm run chain

# Terminal 2: Deploy EVVM to local chain
cd contracts
make deployLocalTestnet
```

#### Option B: Deploy to Testnet (Interactive Wizard)

```bash
npm run wizard
```

The wizard will guide you through:
- Selecting network (Ethereum Sepolia, Arbitrum Sepolia, or custom)
- Configuring EVVM metadata (name, token details)
- Setting administrator addresses
- Deploying and verifying all contracts
- Registering with Registry EVVM

### 6. Start Frontend

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

## 🏗 Project Structure

```
scaffold-evvm/
├── contracts/                    # Foundry + EVVM deployment
│   ├── lib/Testnet-Contracts/   # EVVM contracts (submodule)
│   ├── scripts/wizard.ts         # Deployment wizard
│   ├── input/                    # Generated deployment config
│   ├── Makefile                  # Build commands
│   └── foundry.toml             # Foundry configuration
│
└── frontend/                     # Next.js application
    ├── src/
    │   ├── app/                  # Next.js pages
    │   │   ├── page.tsx         # Home
    │   │   ├── evvm/
    │   │   │   ├── status/      # EVVM status dashboard
    │   │   │   ├── payments/    # Payment transactions
    │   │   │   ├── staking/     # Staking operations
    │   │   │   └── nameservice/ # Username registration
    │   │   └── api/
    │   │       └── deployments/ # Deployment data API
    │   ├── components/
    │   │   ├── WalletConnect.tsx
    │   │   ├── NetworkBadge.tsx
    │   │   └── DebugConsole.tsx
    │   ├── lib/
    │   │   ├── viemClients.ts   # viem client setup
    │   │   ├── evvmConfig.ts    # EVVM configuration
    │   │   ├── evvmSignatures.ts # EIP-191 signature builders
    │   │   └── evvmExecutors.ts  # Transaction executors
    │   ├── styles/               # Plain CSS modules
    │   └── types/                # TypeScript types
    └── package.json
```

## 💻 Development Workflow

### Working with Contracts

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to local Anvil
npm run deploy:local

# Deploy to Ethereum Sepolia
npm run deploy:eth

# Deploy to Arbitrum Sepolia
npm run deploy:arb
```

### Frontend Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Using the Debug Console

The Debug Console shows real-time information about:
- **EIP-191 Message Building**: See the exact message format before signing
- **Signatures**: Inspect generated signatures (r, s, v components)
- **Transaction Payloads**: View function calls and parameters
- **Transaction Hashes**: Direct links to block explorers
- **Errors**: Detailed error messages for debugging

## 🎯 Key Features Explained

### 1. Payments

The Payments page allows you to:

- **Single Pay**: Send tokens to an address or username
- **Disperse Pay**: Send tokens to multiple recipients in one transaction
- **Priority Transactions**: Pay extra fees for faster processing
- **Async/Sync Nonces**: Choose between sequential or parallel transactions

**EIP-191 Message Format:**
```
<selector>,<evvmId>,<from>,<to>,<token>,<amount>,<priorityFee>,<nonce>,<executor>
```

### 2. Staking

Stake MATE tokens to become eligible for fishing rewards:

- View your staked amount and staker status
- Build and sign staking transactions
- Track transaction execution in real-time

**Benefits of Staking:**
- Earn base MATE token rewards (1x per transaction)
- Receive priority fees directly
- Enhanced reward multipliers
- Eligibility for fisher rewards

### 3. Name Service

Register human-readable usernames:

- **Look up** existing username ownership
- **Pre-register** to reserve a username
- **Register** to finalize ownership
- **Use in Payments**: Send to usernames instead of addresses

### 4. Debug Console

Every action shows detailed debugging information:

- Message construction steps
- Signature generation with r, s, v components
- Transaction submission details
- Receipt confirmation and gas usage
- Error messages with context

## 🔧 Configuration

### Target Networks

Configure networks in `frontend/src/lib/viemClients.ts`:

```typescript
const RPC_URLS: Record<number, string> = {
  11155111: 'https://0xrpc.io/sep',        // Ethereum Sepolia
  421614: 'https://sepolia-rollup.arbitrum.io/rpc', // Arbitrum Sepolia
  31337: 'http://localhost:8545',          // Local Anvil
};
```

### EVVM Configuration

After deployment, configuration is automatically saved to:
```
contracts/input/evvmDeploymentSummary.json
```

The frontend reads this file via the `/api/deployments` route.

## 📚 Understanding EIP-191 Signatures

All EVVM transactions use EIP-191 signatures:

```
sign(keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))
```

**Message Format:**
- Comma-separated values
- Starts with function selector (4-byte hex)
- Followed by parameters specific to each function

**Example Pay Message:**
```
0x4faa1fa2,1000,0xYourAddress,0xRecipient,0x...001,1000000,0,0,0x000...
```

## 🧪 Testing

### Contract Tests

```bash
cd contracts
forge test -vv
```

### Signature Builder Tests

Create tests in `contracts/test/`:

```solidity
// Test that signature builders produce expected messages
function testPayMessageFormat() public {
    // Test implementation
}
```

## 🐛 Troubleshooting

### Wallet Connection Issues

**Problem**: "No Ethereum wallet detected"

**Solution**: Install MetaMask or another Web3 wallet extension.

### Deployment Not Found

**Problem**: Frontend shows "No EVVM deployment found"

**Solution**:
1. Ensure you've run the deployment wizard: `npm run wizard`
2. Check that `contracts/input/evvmDeploymentSummary.json` exists
3. Restart the frontend: `npm run dev`

### Wrong Network

**Problem**: Wallet is on wrong network

**Solution**: Use the WalletConnect component to switch networks automatically.

### Transaction Failing

**Problem**: Transactions revert without clear error

**Solution**:
1. Check the Debug Console for detailed error messages
2. Verify you have enough balance (MATE and ETH for gas)
3. Ensure nonce is correct (use next sync nonce from Status page)
4. Check that priority fee is sufficient if using priority transactions

## 🔒 Security Notes

- **Never commit private keys**: Use `cast wallet import` for secure key management
- **Use test networks**: This toolkit is designed for testnets
- **Verify contracts**: Always verify deployed contracts on block explorers
- **Check signatures**: Use the Debug Console to inspect all transaction data before execution

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request with a clear description

## 📖 Resources

- [EVVM Documentation](https://www.evvm.info/)
- [EVVM Testnet Contracts](https://github.com/EVVM-org/Testnet-Contracts)
- [Scaffold-ETH 2 Documentation](https://docs.scaffoldeth.io/)
- [viem Documentation](https://viem.sh/)
- [Foundry Book](https://book.getfoundry.sh/)

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built on top of [EVVM Testnet Contracts](https://github.com/EVVM-org/Testnet-Contracts)
- Inspired by [Scaffold-ETH 2](https://scaffoldeth.io/)
- Powered by [viem](https://viem.sh/) and [Foundry](https://getfoundry.sh/)

---

**Happy Building! ⚡**

For questions or support, please open an issue on GitHub.
