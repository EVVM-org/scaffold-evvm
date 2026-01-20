# Migration Plan: @evvm/viem-signature-library to @evvm/evvm-js

## Overview

This document outlines the migration from the old signature library (`@evvm/viem-signature-library`) to the new SDK (`@evvm/evvm-js`) in the scaffold-evvm frontend.

## Key Differences

### Old Library (@evvm/viem-signature-library)
- **Pattern**: SignatureBuilder classes that return raw signatures
- **Dual signatures**: Returns `{ paySignature, actionSignature }` separately
- **Execution**: Manual InputData construction + writeContract with ABIs
- **Wallet**: Direct wagmi/viem wallet client usage

### New Library (@evvm/evvm-js)
- **Pattern**: Service classes that return `SignedAction` objects
- **Dual signatures**: Pass `evvmSignedAction` to service methods
- **Execution**: Built-in `execute()` function handles everything
- **Wallet**: Signer abstraction via `createSignerWithViem()`

## Migration Strategy

### Phase 1: Foundation
1. Add `@evvm/evvm-js` as dependency
2. Create `useEvvmSigner` hook to integrate with wagmi
3. Create centralized service instances hook

### Phase 2: Core Library Updates
1. Update `evvmSignatures.ts` - main signature creation hub
2. Update `evvmExecutors.ts` - execution utilities
3. Update transaction executers in `utils/transactionExecuters/`

### Phase 3: Component Updates
1. Payment components (2 files)
2. Staking components (3 files)
3. NameService components (10 files)
4. P2PSwap components (4 files)

### Phase 4: Hooks and Pages
1. Update hooks that import ABIs
2. Update page files that import ABIs

### Phase 5: Cleanup
1. Remove old library dependency
2. Clean up unused imports

## Detailed Changes

### New Hook: useEvvmSigner.ts
```typescript
import { createSignerWithViem } from "@evvm/evvm-js/signers";
import { useWalletClient } from "wagmi";

export function useEvvmSigner() {
  const { data: walletClient } = useWalletClient();

  const getSigner = async () => {
    if (!walletClient) throw new Error("Wallet not connected");
    return createSignerWithViem(walletClient);
  };

  return { getSigner, walletClient };
}
```

### New Hook: useEvvmServices.ts
```typescript
import { EVVM, NameService, Staking, P2PSwap } from "@evvm/evvm-js";
import { useEvvmSigner } from "./useEvvmSigner";
import { useEvvmDeployment } from "./useEvvmDeployment";

export function useEvvmServices() {
  const { getSigner } = useEvvmSigner();
  const { evvmAddress, stakingAddress, nameServiceAddress, p2pSwapAddress } = useEvvmDeployment();

  const getServices = async () => {
    const signer = await getSigner();
    return {
      evvm: new EVVM(signer, evvmAddress),
      staking: new Staking(signer, stakingAddress),
      nameService: new NameService(signer, nameServiceAddress),
      p2pSwap: new P2PSwap(signer, p2pSwapAddress),
    };
  };

  return { getServices };
}
```

### Signature Pattern Changes

**Before (old library):**
```typescript
const signatureBuilder = new (EVVMSignatureBuilder as any)(walletClient, walletData);
const signature = await signatureBuilder.signPay(evvmID, to, token, amount, fee, nonce, priority, executor);

const payData: PayInputData = {
  from: walletData.address,
  to_address: to,
  token,
  amount,
  priorityFee: fee,
  nonce,
  priority,
  executor,
  signature,
};
```

**After (evvm-js):**
```typescript
const signer = await createSignerWithViem(walletClient);
const evvm = new EVVM(signer, evvmAddress);

const signedAction = await evvm.pay({
  to,
  tokenAddress: token,
  amount,
  priorityFee: fee,
  nonce,
  priorityFlag: priority,
  executor,
});

// signedAction.data contains all the data including signature
```

### Execution Pattern Changes

**Before (old library):**
```typescript
await writeContract(config, {
  abi: EvvmABI,
  address: evvmAddress,
  functionName: 'pay',
  args: [payInputData],
});
```

**After (evvm-js):**
```typescript
import { execute } from "@evvm/evvm-js";
const txHash = await execute(signer, signedAction);
```

### Dual Signature Pattern Changes (Staking/NameService/P2PSwap)

**Before (old library):**
```typescript
const stakingBuilder = new (StakingSignatureBuilder as any)(walletClient, walletData);
const { paySignature, actionSignature } = await stakingBuilder.signPublicStaking(...);

const stakingData: PublicStakingInputData = {
  // ... manual construction with both signatures
  signature: actionSignature,
  signature_EVVM: paySignature,
};
```

**After (evvm-js):**
```typescript
const evvm = new EVVM(signer, evvmAddress);
const staking = new Staking(signer, stakingAddress);

// First create the EVVM pay action
const evvmAction = await evvm.pay({...});

// Pass it to the staking method
const stakingAction = await staking.publicStaking({
  isStaking: true,
  amountOfStaking,
  nonce,
  evvmSignedAction: evvmAction, // Automatically includes EVVM payment
});

// Execute
const txHash = await execute(signer, stakingAction);
```

## Files to Modify (39 total)

### Core Library Files (7)
1. `src/lib/evvmSignatures.ts` - Complete rewrite
2. `src/lib/evvmExecutors.ts` - Update to use execute()
3. `src/utils/transactionExecuters/evvmExecuter.ts`
4. `src/utils/transactionExecuters/stakingExecuter.ts`
5. `src/utils/transactionExecuters/nameServiceExecuter.ts`
6. `src/utils/transactionExecuters/p2pSwapExecuter.ts`
7. `src/utils/transactionExecuters/index.ts`

### New Files to Create (2)
1. `src/hooks/useEvvmSigner.ts`
2. `src/hooks/useEvvmServices.ts`

### Staking Components (3)
1. `src/components/SigConstructors/StakingFunctions/GoldenStakingComponent.tsx`
2. `src/components/SigConstructors/StakingFunctions/PresaleStakingComponent.tsx`
3. `src/components/SigConstructors/StakingFunctions/PublicStakingComponent.tsx`

### Payment Components (2)
1. `src/components/SigConstructors/PaymentFunctions/PaySignaturesComponent.tsx`
2. `src/components/SigConstructors/PaymentFunctions/DispersePayComponent.tsx`

### NameService Components (10)
1. `PreRegistrationUsernameComponent.tsx`
2. `RegistrationUsernameComponent.tsx`
3. `MakeOfferComponent.tsx`
4. `WithdrawOfferComponent.tsx`
5. `AcceptOfferComponent.tsx`
6. `RenewUsernameComponent.tsx`
7. `AddCustomMetadataComponent.tsx`
8. `RemoveCustomMetadataComponent.tsx`
9. `FlushCustomMetadataComponent.tsx`
10. `FlushUsernameComponent.tsx`

### P2PSwap Components (4)
1. `MakeOrderComponent.tsx`
2. `CancelOrderComponent.tsx`
3. `DispatchOrderFixedComponent.tsx`
4. `DispatchOrderPropotionalComponent.tsx`

### Hooks (2)
1. `src/hooks/useBalances.ts` - ABI import
2. `src/hooks/useEvvmDeployment.ts` - ABI import

### Page Files (8)
1. `src/app/evvm/payments/page.tsx`
2. `src/app/evvm/staking/page.tsx`
3. `src/app/evvm/nameservice/page.tsx`
4. `src/app/evvm/p2pswap/page.tsx`
5. `src/app/faucet/page.tsx`
6. `src/app/config/page.tsx`
7. `src/app/evvm/register/page.tsx`
8. `src/components/SigConstructors/EvvmRegistry/SetEvvmIdComponent.tsx`

### Utility Files (2)
1. `src/components/SigConstructors/FaucetFunctions/FaucetBalanceChecker.tsx`
2. `src/components/SigConstructors/FaucetFunctions/FaucetFunctionsComponent.tsx`

## ABI Migration

The old library exported ABIs:
- `EvvmABI`
- `StakingABI`
- `NameServiceABI`
- `P2PSwapABI`

The new evvm-js library includes ABIs internally but doesn't export them directly. Options:
1. Keep ABIs in a local `src/lib/abis/` directory
2. Import from contract artifacts in `packages/foundry/testnet-contracts/`
3. Use viem's contract utilities that don't require explicit ABI imports

## Testing Checklist

- [ ] Payment: Single pay transaction
- [ ] Payment: Disperse pay to multiple recipients
- [ ] Staking: Golden staking (sync nonce only)
- [ ] Staking: Presale staking
- [ ] Staking: Public staking
- [ ] NameService: Pre-registration
- [ ] NameService: Registration
- [ ] NameService: Make offer
- [ ] NameService: Withdraw offer
- [ ] NameService: Accept offer
- [ ] NameService: Renew username
- [ ] NameService: Add custom metadata
- [ ] NameService: Remove custom metadata
- [ ] NameService: Flush custom metadata
- [ ] NameService: Flush username
- [ ] P2PSwap: Make order
- [ ] P2PSwap: Cancel order
- [ ] P2PSwap: Dispatch order (proportional fee)
- [ ] P2PSwap: Dispatch order (fixed fee)
- [ ] Faucet: Claim tokens
- [ ] Config: Read contract state
