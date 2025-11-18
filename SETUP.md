# Scaffold-EVVM Setup Guide

Quick setup guide to get Scaffold-EVVM running in under 5 minutes.

## 🚀 Quick Start (Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Ensure Testnet-Contracts dependencies are installed (one-time setup)
cd ../Testnet-Contracts
npm install
cd "../The New Scaffold-EVVM"

# 3. Configure Reown Project ID (required for wallet connection)
cp .env.example .env
# Edit .env and add your NEXT_PUBLIC_PROJECT_ID from https://cloud.reown.com

# 4. Run the scaffold (interactive deployment + frontend)
npm run scaffold
```

The `npm run scaffold` command will:
- Automatically find Testnet-Contracts (from sibling directory)
- Guide you through deployment
- Start the frontend automatically!

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- [ ] Git installed
- [ ] MetaMask or Web3 wallet extension
- [ ] Reown Project ID ([Get one here](https://cloud.reown.com) - Free!)

## Setup Steps

### 1. Clone and Install (2 min)

```bash
# Clone the repository
cd scaffold-evvm

# Install all dependencies
npm install

# Initialize git submodules
cd contracts
git submodule update --init --recursive
cd ..
```

### 2. Configure Contracts (1 min)

```bash
cd contracts

# Copy environment template
cp .env.example .env

# Edit .env with your preferred editor
# nano .env  # or vim, code, etc.
```

Add your RPC URLs (optional - defaults provided):
```env
RPC_URL_ETH_SEPOLIA=https://0xrpc.io/sep
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
ETHERSCAN_API=your_key_here
```

### 3. Choose Your Path

#### Path A: Local Development (Fastest)

```bash
# Terminal 1: Start Anvil
npm run chain

# Terminal 2: Deploy to local chain
cd contracts
make deployLocalTestnet

# Terminal 3: Start frontend
cd ../frontend
npm run dev
```

Visit: http://localhost:3000

#### Path B: Testnet Deployment

```bash
# Import your wallet (one-time setup)
cd contracts
cast wallet import defaultKey --interactive
# Enter your private key when prompted

# Run deployment wizard
npm run wizard
# Follow the interactive prompts

# Start frontend
cd ..
npm run dev
```

Visit: http://localhost:3000

## Verify Installation

After starting the frontend, you should see:

1. ✅ Homepage loads with Scaffold-EVVM branding
2. ✅ "Connect Wallet" button in top right
3. ✅ Deployment information if you've deployed an EVVM instance

## Next Steps

1. **Connect Your Wallet**: Click "Connect Wallet" in the UI
2. **View Status**: Navigate to EVVM → Status to see deployment info
3. **Try Payments**: Go to EVVM → Payments to test transactions
4. **Enable Staking**: Visit EVVM → Staking to stake tokens
5. **Register Username**: Check out EVVM → Name Service

## Troubleshooting

### "No EVVM deployment found"
→ Run `npm run wizard` to deploy an EVVM instance

### "Wallet not connected"
→ Install MetaMask and connect your wallet via the UI

### "Wrong network"
→ The UI will prompt you to switch networks automatically

### Port 3000 already in use
→ Kill the process: `lsof -ti:3000 | xargs kill -9`
→ Or use a different port: `PORT=3001 npm run dev`

### Contracts won't compile
→ Ensure Foundry is installed: `forge --version`
→ Reinstall if needed: `foundryup`

### Submodule not found
→ Initialize: `git submodule update --init --recursive`

## Quick Commands Reference

```bash
# Contracts
npm run chain          # Start local blockchain
npm run wizard         # Deploy with interactive wizard
npm run deploy:local   # Deploy to local Anvil
npm run deploy:eth     # Deploy to Ethereum Sepolia
npm run deploy:arb     # Deploy to Arbitrum Sepolia
npm test              # Run contract tests

# Frontend
npm run dev           # Start dev server
npm run build         # Build for production
npm start             # Start production server

# Both
npm install           # Install all dependencies
```

## Getting Help

- Check the [README.md](./README.md) for detailed documentation
- Review [EVVM Documentation](https://www.evvm.info/)
- Open an issue on GitHub

---

**Setup Time: ~5 minutes**

Ready to build on EVVM! 🚀
