# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scaffold-EVVM is a development framework for EVVM (Ethereum Virtual Machine Virtualization) - a system that creates virtual blockchains as smart contracts on existing Ethereum networks. This is a monorepo with contracts and frontend workspaces.

## Key Architecture Concepts

### EVVM Meta-Transaction Pattern
All EVVM operations use **EIP-191 signed messages** instead of direct contract calls. Users sign messages off-chain, and executors (fishers) submit them on-chain. This enables gasless transactions from the user's perspective.

**Message Format:**
```
selector,evvmID,from,to,token,amount,priorityFee,nonce,priorityFlag,executor
```

Example: `0x4faa1fa2,1057,0xFrom,0xTo,0x001,1000000,0,0,false,0x0`

### Dual Nonce System
- **Sync nonces** (sequential): Used for operations requiring strict ordering, like golden staking
- **Async nonces** (parallel): Used for most operations to allow concurrent transactions
- The `priorityFlag` parameter determines which nonce system is used

### Dual Signature Operations
Many operations require TWO signatures:
1. **EVVM signature** - For the payment/transfer operation (via `signPay`)
2. **Module signature** - For the specific module action (staking, nameservice, p2pswap)

This is critical for Staking, NameService, and P2PSwap operations.

### Centralized Signature Building
All signature construction logic is centralized in `frontend/src/lib/evvmSignatures.ts`. This file contains 23+ signature builder functions that use the official `@evvm/viem-signature-library`.

**Never duplicate signature logic** - always import from `evvmSignatures.ts`.

### Transaction Executors
Contract write operations are organized into 4 executor modules in `frontend/src/utils/transactionExecuters/`:
- `evvmExecuter.ts` - Payment operations (pay, dispersePay, etc.)
- `stakingExecuter.ts` - Staking operations (golden, presale, public, unstaking)
- `nameServiceExecuter.ts` - Name service operations (10 functions)
- `p2pSwapExecuter.ts` - P2P swap operations (4 functions)

These executors use wagmi's `writeContract` to interact with smart contracts.

## Development Commands

### Root Commands (use from project root)
```bash
npm install              # Install all dependencies (frontend + contracts)
npm run wizard           # Deploy EVVM with interactive wizard (auto-configures .env)
npm run dev              # Start frontend dev server
npm run build            # Build frontend for production
npm run chain            # Start local Anvil blockchain
npm test                 # Run contract tests
npm run compile          # Compile contracts
```

### Contract Deployment
```bash
# Interactive wizard (recommended) - auto-updates .env
npm run wizard

# Manual deployment
npm run deploy:eth       # Deploy to Ethereum Sepolia
npm run deploy:arb       # Deploy to Arbitrum Sepolia
npm run deploy:local     # Deploy to local Anvil
```

### Contracts Workspace
```bash
cd contracts

# Foundry commands
forge build              # Compile contracts
forge test -vv           # Run tests with verbose output
make anvil               # Start local blockchain
make compile             # Compile contracts
make test                # Run tests
make seeSizes            # Check contract sizes

# Deployment
make deployTestnet NETWORK=eth    # Deploy to Ethereum Sepolia
make deployTestnet NETWORK=arb    # Deploy to Arbitrum Sepolia
make deployLocalTestnet           # Deploy to Anvil
```

### Frontend Workspace
```bash
cd frontend
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run type-check       # TypeScript type checking
```

## Critical Implementation Details

### Golden Staking Bug Fix
**IMPORTANT:** The `signGoldenStaking` function in `evvmSignatures.ts` has a critical fix. It uses `EVVMSignatureBuilder.signPay()` directly instead of `StakingSignatureBuilder.signGoldenStaking()` because the library's method doesn't correctly handle the `priorityFlag` parameter.

Golden staking MUST use sync mode (`priorityFlag: false`) as the Staking contract calls `getNextCurrentSyncNonce(msg.sender)`. See lines 189-240 in `frontend/src/lib/evvmSignatures.ts`.

### Token Address Conventions
- `0x0000000000000000000000000000000000000000` (0x0) = Native ETH
- `0x0000000000000000000000000000000000000001` (0x1) = MATE (EVVM's principal token)
- Other addresses = Custom ERC20 tokens

### Username Resolution
The NameService allows paying to usernames instead of addresses. When a payment's `to` parameter starts with '@' or is a registered username, the NameService resolves it to the owner's address.

### Environment Configuration
**Single source of truth:** The root `.env` file is used by both frontend and contracts workspaces.

After running `npm run wizard`, the wizard automatically updates these variables:
- `NEXT_PUBLIC_EVVM_ADDRESS` - Deployed EVVM contract address
- `NEXT_PUBLIC_CHAIN_ID` - Network chain ID (11155111=Sepolia, 421614=Arbitrum Sepolia)
- `NEXT_PUBLIC_EVVM_ID` - EVVM instance ID read from blockchain

No manual configuration needed after deployment.

### Deployment Data Flow
1. Wizard deploys contracts → generates `contracts/broadcast/` JSON files
2. Wizard reads addresses from broadcast files
3. Wizard calls `getEvvmID()` on deployed contract
4. Wizard updates root `.env` file automatically
5. Frontend reads from `contracts/input/evvmDeploymentSummary.json` via API route

## Testing

### Running Tests
```bash
cd contracts
forge test -vv           # Run all tests with verbose output
forge test --match-test test_PayMessageFormat -vvvv  # Run specific test with traces
```

### Test Structure
- Contract tests are in `contracts/test/`
- Tests use Foundry's `forge-std/Test.sol`
- Focus on signature message format verification (see `SignatureBuilders.t.sol`)

## Common Patterns

### Adding a New Signature Constructor Component
1. Create signature builder function in `frontend/src/lib/evvmSignatures.ts`
2. Create component in `frontend/src/components/SigConstructors/[Module]/`
3. Use reusable input modules from `InputsAndModules/`
4. Import executor function from `transactionExecuters/`
5. Export component from module's `index.ts`

### Reading Contract Data
Use viem's `publicClient.readContract()` with contract ABI and address from deployment config.

```typescript
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { publicClient } from '@/lib/viemClients';

const { deployment } = useEvvmDeployment();
const nonce = await publicClient.readContract({
  address: deployment.evvmAddress,
  abi: evvmABI,
  functionName: 'getCurrentSyncNonce',
  args: [userAddress],
});
```

### Writing Contract Transactions
Use wagmi's `writeContract` via the executor modules:

```typescript
import { executePay } from '@/utils/transactionExecuters';
import { signPay } from '@/lib/evvmSignatures';

// 1. Build signature
const { signature, inputData } = await signPay({
  evvmID: deployment.evvmID,
  to: recipientAddress,
  tokenAddress: '0x1', // MATE
  amount: amountInWei,
  priorityFee: 0,
  nonce: currentNonce,
  priority: false,
  executor: '0x0', // Anyone can execute
});

// 2. Execute transaction
await executePay(inputData, deployment.evvmAddress);
```

## Project Structure

```
scaffold-evvm/
├── .env                          # Single source of truth for env vars
├── contracts/
│   ├── lib/Testnet-Contracts/   # Git submodule with EVVM contracts
│   ├── scripts/
│   │   ├── wizard.ts            # Deployment wizard (auto-config)
│   │   └── refresh-deployment.ts
│   ├── input/
│   │   └── evvmDeploymentSummary.json  # Generated deployment data
│   ├── Makefile                 # Foundry build commands
│   └── foundry.toml             # Foundry configuration
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js 15 App Router pages
│   │   ├── components/
│   │   │   └── SigConstructors/  # 23 signature constructor components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/
│   │   │   ├── evvmSignatures.ts    # CENTRALIZED signature builders
│   │   │   ├── evvmConfig.ts        # EVVM configuration
│   │   │   └── viemClients.ts       # viem client setup
│   │   ├── utils/
│   │   │   └── transactionExecuters/  # 4 executor modules (27 functions)
│   │   └── config/              # Wagmi/network config
│   └── next.config.mjs
└── package.json                 # Root workspace config
```

## Important Files to Know

- `frontend/src/lib/evvmSignatures.ts` - All signature construction (1400+ lines)
- `frontend/src/utils/transactionExecuters/index.ts` - All transaction executors
- `frontend/src/hooks/useEvvmDeployment.ts` - Access deployment configuration
- `contracts/scripts/wizard.ts` - Deployment automation
- `contracts/foundry.toml` - Contract remappings and RPC endpoints
- `.env` - Environment configuration (auto-updated by wizard)

## Debugging

### Frontend Debug Console
The frontend has a built-in Debug Console that shows:
- EIP-191 message format before signing
- Signature values
- Transaction parameters
- Explorer links

Access via the debug console component in each page.

### Common Issues

**"No EVVM deployment found"**
- Run `npm run wizard` to deploy
- Check that `contracts/input/evvmDeploymentSummary.json` exists
- Verify `.env` has `NEXT_PUBLIC_EVVM_ADDRESS` set

**"Nonce too low" or "Nonce already used"**
- Always fetch current nonce from contract before creating transaction
- Use `getCurrentSyncNonce` for sync operations
- Use `getNextRandomNonce` for async operations

**"Signature verification failed"**
- Ensure EVVM ID matches deployed instance
- Verify all parameters match exactly between signing and execution
- Check that priorityFlag matches nonce type (sync vs async)

**Golden Staking fails**
- MUST use sync nonce (priorityFlag: false)
- See the critical fix in `evvmSignatures.ts:189-240`
- Golden staking requires 24h cooldown (will be reduced to 1 min)

## Security Notes

- Never commit `.env` file (it's in `.gitignore`)
- Use `cast wallet import` for encrypted private key storage (stored in `~/.foundry/keystores/`)
- The wizard expects wallet alias `defaultKey` - this is hardcoded
- All deployments auto-verify on block explorers (Etherscan/Arbiscan)
- Testnet only - not audited for mainnet production

## External Documentation

- [EVVM Documentation](https://www.evvm.info/docs)
- [EVVM Signature Structures](https://www.evvm.org/docs/SignatureStructures/)
- [Testnet Contracts Repo](https://github.com/EVVM-org/Testnet-Contracts)
- [viem Documentation](https://viem.sh/)
- [Foundry Book](https://book.getfoundry.sh/)
- [@evvm/viem-signature-library](https://www.npmjs.com/package/@evvm/viem-signature-library)
