# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scaffold-EVVM is a frontend development tool for building EVVM (Ethereum Virtual Machine Virtualization) signature constructors. This is a pure frontend application that helps developers create and submit signed transactions to EVVM networks.

EVVM creates virtual blockchains as smart contracts on existing Ethereum networks. This tool focuses on building the cryptographic signatures needed for EVVM operations.

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
All signature construction logic is centralized in `src/lib/evvmSignatures.ts`. This file contains 23+ signature builder functions that use the official `@evvm/viem-signature-library`.

**Never duplicate signature logic** - always import from `evvmSignatures.ts`.

### Transaction Executors
Contract write operations are organized into 4 executor modules in `src/utils/transactionExecuters/`:
- `evvmExecuter.ts` - Payment operations (pay, dispersePay, etc.)
- `stakingExecuter.ts` - Staking operations (golden, presale, public, unstaking)
- `nameServiceExecuter.ts` - Name service operations (10 functions)
- `p2pSwapExecuter.ts` - P2P swap operations (4 functions)

These executors use wagmi's `writeContract` to interact with smart contracts.

## Contract Discovery

This application uses a **contract discovery pattern** instead of deployment:

1. **User provides**: EVVM core contract address in `.env`
2. **App discovers**: Staking, NameService, Estimator addresses from EVVM contract
3. **Optional**: Treasury and P2PSwap (user provides or skips)

### Environment Configuration

Required in `.env`:
```bash
NEXT_PUBLIC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_EVVM_ADDRESS=0x... # EVVM core contract address
NEXT_PUBLIC_CHAIN_ID=11155111  # Network chain ID
```

Chain IDs:
- `11155111` - Ethereum Sepolia
- `421614` - Arbitrum Sepolia
- `31337` - Local Anvil

The app automatically discovers:
- Staking contract via `evvm.getStakingAddress()`
- NameService contract via `evvm.getNameServiceAddress()`
- Estimator contract via `evvm.getEstimatorAddress()`

## Development Commands

### Setup
```bash
npm install              # Install all dependencies
npm run dev              # Start dev server (validates .env first)
npm run build            # Build for production
npm run start            # Start production server
npm run type-check       # TypeScript type checking
```

### Environment Validation
```bash
npm run check-env        # Validates .env configuration
```

The `check-env` script validates:
- `NEXT_PUBLIC_PROJECT_ID` is set
- `NEXT_PUBLIC_EVVM_ADDRESS` is a valid Ethereum address
- `NEXT_PUBLIC_CHAIN_ID` is set

## Critical Implementation Details

### Golden Staking Bug Fix
**IMPORTANT:** The `signGoldenStaking` function in `evvmSignatures.ts` has a critical fix. It uses `EVVMSignatureBuilder.signPay()` directly instead of `StakingSignatureBuilder.signGoldenStaking()` because the library's method doesn't correctly handle the `priorityFlag` parameter.

Golden staking MUST use sync mode (`priorityFlag: false`) as the Staking contract calls `getNextCurrentSyncNonce(msg.sender)`. See lines 189-240 in `src/lib/evvmSignatures.ts`.

### Token Address Conventions
- `0x0000000000000000000000000000000000000000` (0x0) = Native ETH
- `0x0000000000000000000000000000000000000001` (0x1) = MATE (EVVM's principal token)
- Other addresses = Custom ERC20 tokens

### Username Resolution
The NameService allows paying to usernames instead of addresses. When a payment's `to` parameter starts with '@' or is a registered username, the NameService resolves it to the owner's address.

## Testing

This is a frontend-only application. For contract testing, see the [Testnet-Contracts repository](https://github.com/EVVM-org/Testnet-Contracts).

## Common Patterns

### Adding a New Signature Constructor Component
1. Create signature builder function in `src/lib/evvmSignatures.ts`
2. Create component in `src/components/SigConstructors/[Module]/`
3. Use reusable input modules from `InputsAndModules/`
4. Import executor function from `transactionExecuters/`
5. Export component from module's `index.ts`

### Reading Contract Data
Use viem's `publicClient.readContract()` with contract ABI and discovered address.

```typescript
import { useEvvmContracts } from '@/hooks/useEvvmContracts';
import { publicClient } from '@/lib/viemClients';

const { contracts } = useEvvmContracts();
const nonce = await publicClient.readContract({
  address: contracts.evvmAddress,
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
  evvmID: contracts.evvmID,
  to: recipientAddress,
  tokenAddress: '0x1', // MATE
  amount: amountInWei,
  priorityFee: 0,
  nonce: currentNonce,
  priority: false,
  executor: '0x0', // Anyone can execute
});

// 2. Execute transaction
await executePay(inputData, contracts.evvmAddress);
```

## Project Structure

```
scaffold-evvm/
├── .env                          # Environment configuration
├── src/
│   ├── app/                      # Next.js 15 App Router pages
│   ├── components/
│   │   └── SigConstructors/      # 23 signature constructor components
│   ├── hooks/                    # Custom React hooks
│   │   └── useEvvmContracts.ts   # Contract discovery hook
│   ├── lib/
│   │   ├── evvmSignatures.ts     # CENTRALIZED signature builders
│   │   ├── evvmConfig.ts         # EVVM configuration
│   │   └── viemClients.ts        # viem client setup
│   ├── utils/
│   │   └── transactionExecuters/ # 4 executor modules (27 functions)
│   └── config/                   # Wagmi/network config
├── scripts/
│   └── check-env.js              # Environment validation
└── package.json
```

## Important Files to Know

- `src/lib/evvmSignatures.ts` - All signature construction (1400+ lines)
- `src/utils/transactionExecuters/index.ts` - All transaction executors
- `src/hooks/useEvvmContracts.ts` - Contract discovery and configuration
- `scripts/check-env.js` - Environment validation
- `.env` - Environment configuration

## Debugging

### Frontend Debug Console
The frontend has a built-in Debug Console that shows:
- EIP-191 message format before signing
- Signature values
- Transaction parameters
- Explorer links

Access via the debug console component in each page.

### Common Issues

**"No EVVM address found"**
- Check `.env` has `NEXT_PUBLIC_EVVM_ADDRESS` set
- Verify address is valid Ethereum address
- Run `npm run check-env` to validate configuration

**"Contract discovery failed"**
- Verify EVVM contract is deployed at the address
- Check that `NEXT_PUBLIC_CHAIN_ID` matches network
- Ensure you're connected to the correct network in wallet

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
- Use WalletConnect for secure wallet connections
- Frontend-only - no private keys stored
- All signatures created client-side in user's browser
- Testnet only - not audited for mainnet production

## External Documentation

- [EVVM Documentation](https://www.evvm.info/docs)
- [EVVM Signature Structures](https://www.evvm.org/docs/SignatureStructures/)
- [Testnet Contracts Repo](https://github.com/EVVM-org/Testnet-Contracts)
- [viem Documentation](https://viem.sh/)
- [@evvm/viem-signature-library](https://www.npmjs.com/package/@evvm/viem-signature-library)
