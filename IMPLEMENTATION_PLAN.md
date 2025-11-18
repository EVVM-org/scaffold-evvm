# Scaffold-EVVM Implementation Plan

## Current Status ✅
- [x] Git repository initialized
- [x] "fixings" branch created
- [x] Testnet-Contracts added as git submodule
- [x] Successful deployment to Sepolia
- [x] Frontend running with Reown WalletConnect
- [x] Basic EVVM pages (status, payments, staking, nameservice)

## Analysis: What We Need to Add

### From EVVM-Signature-Constructor-Front (35 components)
1. **Faucet Functions** (2 components)
   - FaucetFunctionsComponent - Claim MATE tokens
   - FaucetBalanceChecker - Check faucet balance

2. **Payment Functions** (2 components)
   - PaySignaturesComponent - Single payments
   - DispersePayComponent - Batch payments

3. **Staking Functions** (3 components)
   - GoldenStakingComponent - Golden fisher staking
   - PresaleStakingComponent - Presale period staking
   - PublicStakingComponent - Public staking

4. **Name Service Functions** (11 components)
   - PreRegistrationUsernameComponent
   - RegistrationUsernameComponent
   - MakeOfferComponent
   - WithdrawOfferComponent
   - AcceptOfferComponent
   - RenewUsernameComponent
   - AddCustomMetadataComponent
   - RemoveCustomMetadataComponent
   - FlushCustomMetadataComponent
   - FlushUsernameComponent
   - Custom metadata management

5. **P2P Swap Functions** (4 components)
   - MakeOrderComponent
   - CancelOrderComponent
   - DispatchOrderFillPropotionalFeeComponent
   - DispatchOrderFillFixedFeeComponent

6. **Input & Modules** (~13 reusable components)
   - Address inputs with validation
   - Amount inputs with BigInt handling
   - Nonce management
   - Signature builders

### From boilerplate - EVVM front
1. **UI Components**
   - Theme provider (dark/light mode)
   - Better button components
   - Input field components
   - Spinner/loading states
   - Empty states
   - Navbar
   - Balance display

2. **Enhanced Features**
   - Real-time balance checking
   - Transaction status monitoring
   - EVVM info display

## Implementation Strategy

### Phase 1: Core Infrastructure ✅
- [x] Repository setup
- [x] Testnet-Contracts as submodule
- [ ] Update wizard to prefer local submodule
- [ ] Auto-populate deployment addresses from wizard output

### Phase 2: Essential Features (Priority 1)
- [ ] Add @evvm/viem-signature-library to frontend
- [ ] Create signature constructor hook system
- [ ] Add MATE token faucet
- [ ] Add basic payment signature constructor
- [ ] Add staking functionality

### Phase 3: Advanced Features (Priority 2)
- [ ] Add all Name Service functions
- [ ] Add P2P Swap functions
- [ ] Add batch payment (disperse)
- [ ] Add transaction history

### Phase 4: UI/UX Enhancement (Priority 3)
- [ ] Add theme provider
- [ ] Enhance navigation
- [ ] Add real-time updates
- [ ] Add debug console
- [ ] Add transaction status tracker

### Phase 5: Testing & Documentation
- [ ] Test all signature constructors
- [ ] Test deployment workflow
- [ ] Update documentation
- [ ] Create video tutorial

## Technical Decisions

### Architecture
- **Component Structure**: Modular signature constructors per contract function
- **State Management**: React hooks + Wagmi for wallet state
- **Styling**: Plain CSS modules (no Tailwind to keep it simple)
- **Type Safety**: Full TypeScript with strict mode

### Dependencies to Add
```json
{
  "@evvm/viem-signature-library": "^2.1.1" // Already added ✅
}
```

### File Structure
```
frontend/src/
├── app/
│   ├── faucet/          # NEW: MATE token faucet
│   ├── transactions/    # NEW: Transaction constructor
│   ├── debug/           # NEW: Debug tools
│   └── evvm/
│       ├── payments/    # ENHANCE: Add signature constructor
│       ├── staking/     # ENHANCE: Add all staking types
│       ├── nameservice/ # ENHANCE: Add all functions
│       └── p2pswap/     # NEW: P2P swap page
├── components/
│   ├── faucet/          # NEW: Faucet components
│   ├── signatures/      # NEW: Signature constructors
│   ├── ui/              # NEW: UI library
│   └── debug/           # NEW: Debug components
├── hooks/
│   ├── useEvvmDeployment.ts    # NEW: Get deployment info
│   ├── useSignatureBuilder.ts  # NEW: Build signatures
│   └── useTransactionExecutor.ts # NEW: Execute txs
└── utils/
    ├── evvmSignatures.ts # NEW: Signature utilities
    └── validation.ts     # NEW: Input validation
```

## Success Criteria

1. ✅ User can deploy EVVM instance with one command
2. ✅ User can see deployment status in frontend
3. ⏳ User can claim MATE tokens from faucet
4. ⏳ User can construct and execute all EVVM transaction types
5. ⏳ User can debug transactions easily
6. ⏳ All functionality works without errors
7. ⏳ Documentation is complete and clear

## Next Steps

1. Add faucet functionality
2. Create signature constructor components
3. Integrate @evvm/viem-signature-library
4. Test all flows
5. Polish UI/UX
6. Complete documentation
