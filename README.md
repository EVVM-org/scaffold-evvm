# 🏗️ Scaffold-EVVM 🧉

**The complete development environment for EVVM ecosystem.**

#### 📚 [Documentation](https://evvm.org/docs) | 🌐 [Website](https://evvm.info)

Built using NextJS, Foundry/Hardhat, Wagmi, Viem, and TypeScript.

- ✅ **Auto-Setup** - Contracts automatically cloned and configured on first run
- 🔧 **Dual Framework** - Choose Foundry or Hardhat for smart contract development
- 📦 **Contract Source** - Testnet-Contracts
- 🧙 **Interactive CLI Wizard** - Guided setup for framework, contracts, and configuration
- ⛓️ **Local Development** - Deploy to Anvil or Hardhat Network for rapid iteration
- 💰 **Auto-Funding** - Automatically funds wallets from test accounts
- 🔐 **Meta-Transactions** - EIP-191 gasless signatures submitted by executors
- 🎨 **Signature Constructor Frontend** - 23+ signature constructors for all EVVM operations
- 🔍 **Username Lookup** - Look up registered NameService usernames and their owners
- 💱 **Human-Readable Amounts** - Enter token amounts as decimals (e.g., "10.5") instead of raw wei

> ⚠️ **Note:** This version supports **local deployment only**. Testnet deployment will be available in a future release.

---

## Requirements

Before you begin, you need to install the following tools:

- [Node.js](https://nodejs.org/) (v18+)
- npm (comes with Node.js)
- [Git](https://git-scm.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for Foundry framework)

---

## 🚀 Quickstart

**1. Clone and install:**

```bash
git clone https://github.com/EVVM-org/scaffold-evvm.git
cd scaffold-evvm
npm install
```

**2. Start everything with a single command:**

```bash
npm run wizard
```

This command will:
- ✅ Check all prerequisites
- 📦 Auto-clone Testnet-Contracts from GitHub (if not already present)
- 🔧 Guide you through framework selection (Foundry/Hardhat)
- 📦 Select contract source (Testnet)
- ⚙️ Configure EVVM (admin addresses, token metadata)
- 🔨 Compile contracts
- ⛓️ Start local chain (Anvil or Hardhat Network)
- 🚀 Deploy all 6 EVVM contracts
- 🌐 Launch frontend at http://localhost:3000

> 💡 **Tip:** Keep the terminal open to maintain the local chain running.

---

## 🛠️ Alternative: Two-Terminal Workflow

For more control during development:

**Terminal 1 - Deploy contracts:**
```bash
npm run cli deploy
```

**Terminal 2 - Start frontend:**
```bash
npm run frontend
```

**Terminal 3 (optional) - Monitor blockchain:**
```bash
npm run monitor
```

This shows real-time blocks, transactions, contract calls, gas usage, and deployment addresses on the local chain.

---

## 🔧 Troubleshooting

If you encounter issues:

```bash
npm run cli flush   # Clear all caches and stop servers
npm run wizard  # Fresh start
```

Common issues solved by `flush`:
- Nonce errors ("Nonce too high/low")
- Port 8545 already in use
- Transaction reverted / deployment failed

**Stuck transactions after redeploying:**

When you redeploy the local blockchain (e.g., restarting Anvil/Hardhat), the chain resets to nonce 0 but your wallet still remembers the old nonce. This causes transactions to hang or fail. To fix:

1. Run `npm run cli flush` to reset the server-side state
2. In your wallet (MetaMask/Rabby), **clear activity and nonce data**:
   - **MetaMask:** Settings → Advanced → Clear activity tab data
   - **Rabby:** Settings → Clear pending transactions
3. Restart with `npm run wizard`

---

## 📦 Core Contracts

Scaffold-EVVM deploys 6 core EVVM contracts:

| Contract | Description |
|----------|-------------|
| **Core** | Core contract managing payments and tokens via EIP-191 signatures |
| **Staking** | Era-based reward system for MATE token holders |
| **Estimator** | Staking rewards calculation engine |
| **NameService** | Username registration and identity management |
| **Treasury** | Cross-chain asset management |
| **P2PSwap** | Peer-to-peer token exchange |

---

## 🔐 Local Network

Both Anvil and Hardhat Network use:
- **Port:** 8545
- **Chain ID:** 31337
- **Test Account:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

> ⚠️ **Warning:** These are publicly known test keys. Never use on networks with real value.

---

## 📁 Project Structure

```
scaffold-evvm/
├── cli/                    # Interactive CLI wizard
├── packages/
│   ├── foundry/            # Foundry package
│   │   ├── testnet-contracts/    # Production EVVM contracts (bundled snapshot)
│   │   └── contracts/            # Your custom services
│   ├── hardhat/            # Hardhat package
│   └── nextjs/             # Frontend application (@evvm/evvm-js from npm)
├── Testnet-Contracts/      # Auto-cloned at deploy time (git ignored)
├── input/                  # EVVM configuration (generated)
└── deployments/            # Deployment summaries (generated)
```

---

## 📚 Documentation

- [EVVM Documentation](https://evvm.org/docs) - Complete EVVM protocol documentation
- [EVVM Website](https://evvm.info) - Learn more about EVVM ecosystem
- [Signature Structures](https://evvm.org/docs/SignatureStructures/) - EIP-191 signature formats
- [Foundry Book](https://book.getfoundry.sh/) - Foundry documentation
- [Hardhat Docs](https://hardhat.org/docs) - Hardhat documentation

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following the [commit message convention](https://github.com/joelparkerhenderson/git-commit-message)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

EVVM Noncommercial License v1.0 - see [LICENSE](LICENSE) for details.

For commercial use, contact: g@evvm.org

---

<p align="center">
  Made with 🧉 for the EVVM ecosystem
  <br/>
  Inspired by <a href="https://github.com/scaffold-eth/scaffold-eth-2">🏗️ Scaffold-ETH</a>
</p>
