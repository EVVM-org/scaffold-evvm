# 🏗️ Scaffold-EVVM

**A frontend development tool for building EVVM (Ethereum Virtual Machine Virtualization) signature constructors.**

Scaffold-EVVM helps you create and execute EIP-191 signed transactions for EVVM operations. This is a pure frontend application - no deployment functionality, just signature construction and transaction execution.

---

## ✨ Features

- ✅ **23+ Signature Constructors** - For all EVVM operations (Payments, Staking, NameService, P2PSwap)
- ✅ **Automatic Contract Discovery** - Discovers Staking, NameService, and Estimator addresses from EVVM core
- ✅ **Meta-Transaction Pattern** - EIP-191 gasless signatures submitted by executors (fishers)
- ✅ **Dual Nonce Support** - Sync and async nonce systems for different operation types
- ✅ **Wallet Integration** - WalletConnect/Reown support for all major wallets
- ✅ **Built-in Debug Console** - View message formats, signatures, and transaction parameters
- ✅ **Block Explorer Integration** - Direct links to Etherscan/Arbiscan for transactions

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A WalletConnect Project ID ([Get one free](https://cloud.reown.com))
- An existing EVVM contract address (deployed on testnet)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd scaffold-evvm

# Install dependencies
npm install
```

### Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure .env:**
   ```bash
   # Required: WalletConnect Project ID
   NEXT_PUBLIC_PROJECT_ID=your_reown_project_id_here

   # Required: Your EVVM contract address
   NEXT_PUBLIC_EVVM_ADDRESS=0x...your_evvm_contract_address

   # Required: Network chain ID
   # 11155111 = Ethereum Sepolia
   # 421614   = Arbitrum Sepolia
   NEXT_PUBLIC_CHAIN_ID=11155111

   # Optional: EVVM instance ID (if registered)
   NEXT_PUBLIC_EVVM_ID=
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

---

## 🎯 What This Tool Does

### Contract Discovery Flow

```
User provides EVVM address (.env)
          ↓
App reads EVVM contract on-chain
          ↓
Discovers contract addresses automatically:
  • Staking:     evvm.getStakingAddress()
  • NameService: evvm.getNameServiceAddress()
  • Estimator:   evvm.getEstimatorAddress()
          ↓
Ready to build signatures!
```

### Signature Constructor Flow

```
1. User fills form → Component collects parameters
2. Click "Sign" → Creates EIP-191 message
3. Wallet prompts → User signs message off-chain
4. Click "Execute" → Submits to EVVM contract
5. Transaction confirmed → View on block explorer
```

---

## 📚 Available Signature Constructors

### Payment Operations (EVVM)
- `signPay` - Single payment to address or username
- `signDispersePay` - Multiple payments in one transaction
- `signPayMultiple` - Batch payments (advanced)

### Staking Operations
- `signGoldenStaking` - Become a golden fisher (special privileges)
- `signPresaleStaking` - Presale staking (1 MATE fixed)
- `signPublicStaking` - Public staking (5083 MATE per sMATE)
- `signPublicServiceStaking` - Staking for ecosystem services

### NameService Operations
- `signPreRegistrationUsername` - Reserve a username
- `signRegistrationUsername` - Register a username
- `signMakeOffer` - Make an offer for a username
- `signWithdrawOffer` - Withdraw your username offer
- `signAcceptOffer` - Accept an offer for your username
- `signRenewUsername` - Renew your username registration
- `signAddCustomMetadata` - Add custom metadata to username
- `signRemoveCustomMetadata` - Remove custom metadata
- `signFlushCustomMetadata` - Remove all custom metadata
- `signFlushUsername` - Delete username completely

### P2P Swap Operations
- `signMakeOrder` - Create a P2P swap order
- `signCancelOrder` - Cancel your swap order
- `signDispatchOrderFillProportionalFee` - Fill order with proportional fee
- `signDispatchOrderFillFixedFee` - Fill order with fixed fee

---

## 🏗️ Project Structure

```
scaffold-evvm/
├── src/
│   ├── app/                          # Next.js 15 pages
│   │   ├── page.tsx                  # Homepage with all constructors
│   │   ├── evvm/                     # EVVM-specific pages
│   │   └── faucet/                   # Testnet faucet
│   ├── components/
│   │   └── SigConstructors/          # 23 signature constructor components
│   │       ├── Evvm/                 # Payment constructors
│   │       ├── StakingFunctions/     # Staking constructors
│   │       ├── NameService/          # NameService constructors
│   │       └── P2PSwap/              # P2PSwap constructors
│   ├── hooks/
│   │   ├── useEvvmDeployment.ts      # Contract discovery hook
│   │   └── ...other hooks
│   ├── lib/
│   │   ├── evvmSignatures.ts         # Centralized signature builders
│   │   ├── evvmConfig.ts             # EVVM configuration utilities
│   │   └── viemClients.ts            # Viem client setup
│   ├── utils/
│   │   └── transactionExecuters/     # Transaction execution functions
│   │       ├── evvmExecuter.ts       # Payment executors
│   │       ├── stakingExecuter.ts    # Staking executors
│   │       ├── nameServiceExecuter.ts # NameService executors
│   │       └── p2pSwapExecuter.ts    # P2PSwap executors
│   └── types/
│       └── evvm.ts                   # TypeScript type definitions
├── .env                              # Your configuration (not committed)
├── .env.example                      # Configuration template
└── package.json
```

---

## 🔧 Development Commands

```bash
# Start development server (with env validation)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Validate environment configuration
npm run check-env
```

---

## 🎓 How EVVM Works

### Meta-Transaction Pattern

EVVM uses **EIP-191 signed messages** instead of traditional contract calls:

1. **User signs message off-chain** (no gas cost)
2. **Executor (fisher) submits on-chain** (pays gas)
3. **Contract verifies signature** and executes
4. **User receives result** without paying gas

**Message Format:**
```
selector,evvmID,from,to,token,amount,priorityFee,nonce,priorityFlag,executor
```

**Example:**
```
0x4faa1fa2,1057,0xAlice,0xBob,0x001,1000000,0,42,false,0x0
```

### Dual Nonce System

- **Sync Nonces** (`priorityFlag: false`) - Sequential, for operations requiring order
- **Async Nonces** (`priorityFlag: true`) - Parallel, for independent operations

### Dual Signature Operations

Some operations require **two signatures**:
1. **EVVM signature** - For payment/transfer
2. **Module signature** - For specific module action

Examples: Staking, NameService, P2PSwap operations

---

## 🌐 Supported Networks

- **Ethereum Sepolia** (Chain ID: `11155111`)
- **Arbitrum Sepolia** (Chain ID: `421614`)
- **Local Anvil** (Chain ID: `31337`)
- Any EVM-compatible testnet

---

## 🐛 Troubleshooting

### "No EVVM address found"
- Check `.env` has `NEXT_PUBLIC_EVVM_ADDRESS` set
- Run `npm run check-env` to validate configuration
- Ensure address format is valid (`0x...`)

### "Contract discovery failed"
- Verify EVVM contract is deployed at the address
- Check network connection (RPC endpoint working)
- Ensure `NEXT_PUBLIC_CHAIN_ID` matches the actual network
- Check browser console for detailed error messages

### "Nonce too low" or "Nonce already used"
- Always fetch current nonce from contract before signing
- Use `getCurrentSyncNonce` for sync operations
- Use `getNextRandomNonce` for async operations
- Don't reuse old signatures

### "Signature verification failed"
- Verify EVVM ID matches the deployed instance
- Check all parameters match between signing and execution
- Ensure `priorityFlag` matches nonce type
- Confirm wallet is connected to correct network

### Golden Staking Issues
- Must use **sync nonce** (`priorityFlag: false`)
- Requires 24-hour cooldown between stakes
- See critical fix in `evvmSignatures.ts:189-240`

---

## 📦 Dependencies

- **Next.js 15** - React framework with App Router
- **viem** - Ethereum library for contract interactions
- **wagmi** - React hooks for Ethereum
- **@reown/appkit** - Wallet connection (WalletConnect)
- **@evvm/viem-signature-library** - Official EVVM signature builders

---

## 🔐 Security

- ✅ Never commit `.env` file (in `.gitignore`)
- ✅ All signing happens client-side in browser
- ✅ No private keys stored or transmitted
- ✅ WalletConnect for secure wallet connections
- ⚠️  **Testnet only** - Not audited for mainnet

---

## 📖 Documentation

- [EVVM Documentation](https://www.evvm.info/docs)
- [EVVM Signature Structures](https://www.evvm.org/docs/SignatureStructures/)
- [Testnet Contracts Repo](https://github.com/EVVM-org/Testnet-Contracts)
- [viem Documentation](https://viem.sh/)
- [@evvm/viem-signature-library](https://www.npmjs.com/package/@evvm/viem-signature-library)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- Built with [@evvm/viem-signature-library](https://www.npmjs.com/package/@evvm/viem-signature-library)
- Powered by [EVVM](https://www.evvm.org/) - Ethereum Virtual Machine Virtualization
- Uses [WalletConnect](https://walletconnect.com/) for wallet integration

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/EVVM-org/scaffold-evvm/issues)
- **Documentation:** [EVVM Docs](https://www.evvm.info/docs)
- **Community:** [EVVM Discord](https://discord.gg/evvm)

---

Made with ❤️ for the EVVM ecosystem
