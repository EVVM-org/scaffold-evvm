# Scaffold-EVVM Transformation Plan

## Mission Analysis

Transform scaffold-evvm from a deployment-focused framework into a pure signature constructor frontend that:
1. Loads EVVM core address from .env
2. Discovers other contract addresses from the EVVM contract
3. Follows EVVM-Signature-Constructor-Front patterns exactly
4. Uses @evvm/viem-signature-library for all signatures
5. Has no deployment capabilities

## Current State Analysis

### EVVM-Signature-Constructor-Front (Reference)
- ✅ Uses @evvm/viem-signature-library v2.1.1
- ✅ Individual component files for each constructor
- ✅ Direct executor functions (not React hooks)
- ✅ Simple structure: components + executors + utils
- ✅ Staking calculation: `BigInt(5083) * BigInt(10) ** BigInt(18)`
- ✅ No deployment features

### scaffold-evvm (Current)
- ❌ Has deployment wizard and scripts
- ❌ Complex monorepo with contracts workspace
- ❌ Uses deployment API routes
- ✅ Has centralized signature builders
- ✅ Has correct staking calculation
- ✅ Uses @evvm/viem-signature-library v2.1.1

## Detailed Execution Plan

### Phase 1: Analysis & Branch Creation (15 min)
1. ✅ Analyze both codebases
2. Create new branch `fixings-deep-double-check`
3. Document all differences in signature constructors
4. Document all differences in executors

### Phase 2: Remove Deployment Functionality (30 min)
1. Remove contracts workspace entirely
2. Remove deployment scripts and wizard
3. Remove Makefile
4. Remove foundry.toml
5. Remove deployment API routes
6. Remove deployment-related hooks
7. Update package.json (remove deployment scripts)

### Phase 3: Implement Contract Discovery (45 min)
1. Create contract address discovery system:
   - Load EVVM address from .env
   - Call `getStakingAddress()` on EVVM contract
   - Call `getNameServiceAddress()` on EVVM contract
   - Call `getEstimatorAddress()` on EVVM contract
   - Treasury and P2PSwap are optional (user provides or skips)
2. Create new .env structure:
   ```
   NEXT_PUBLIC_PROJECT_ID=
   NEXT_PUBLIC_EVVM_ADDRESS=
   NEXT_PUBLIC_CHAIN_ID=
   ```
3. Create contract discovery hook

### Phase 4: Match Executor Patterns (30 min)
1. Compare executors line-by-line:
   - EVVM executors (pay, dispersePay, payMultiple)
   - Staking executors (golden, presale, public, publicService)
   - NameService executors (10 functions)
   - P2PSwap executors (4 functions)
2. Ensure exact argument order matches
3. Verify all functions exist and match

### Phase 5: Verify Signature Constructors (30 min)
1. Check all signature builders match @evvm/viem-signature-library usage
2. Verify staking calculations:
   - Golden: `BigInt(amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18))`
   - Presale: `(1 * 10 ** 18)`
   - Public: `BigInt(amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18))`
3. Ensure all 19+ signature functions are present

### Phase 6: Clean Documentation (15 min)
1. Remove files:
   - DOUBLECHECK_AUDIT_REPORT.md
   - EXECUTION_PLAN.md (this file, after completion)
   - Any deployment-related docs
2. Keep:
   - CLAUDE.md (update to reflect changes)
   - README.md (update completely)
   - LICENSE

### Phase 7: Update README.md (30 min)
New README structure:
1. What is Scaffold-EVVM (signature constructor tool)
2. Prerequisites
3. Setup:
   - Install dependencies
   - Configure .env (EVVM address + chain ID)
   - Run npm run dev
4. How it works:
   - Loads EVVM address
   - Discovers contract addresses
   - Builds signatures
   - Executes transactions
5. Available signature constructors (23 total)
6. Troubleshooting

### Phase 8: Update npm Scripts (15 min)
1. Create env validation script
2. Update package.json scripts:
   ```json
   {
     "dev": "npm run check-env && next dev",
     "build": "next build",
     "start": "next start",
     "check-env": "node scripts/check-env.js"
   }
   ```
3. Create scripts/check-env.js:
   - Validates NEXT_PUBLIC_PROJECT_ID
   - Validates NEXT_PUBLIC_EVVM_ADDRESS
   - Validates NEXT_PUBLIC_CHAIN_ID
   - Shows helpful error messages

### Phase 9: Update CLAUDE.md (15 min)
1. Remove deployment sections
2. Add contract discovery section
3. Update architecture description
4. Update commands
5. Add new troubleshooting items

### Phase 10: Testing (30 min)
1. Test contract discovery
2. Test all signature constructors
3. Test all executors
4. Test .env validation
5. Verify no deployment features remain

## Comparison Checklist

### Signature Constructors (19 total)
- [ ] signPay
- [ ] signDispersePay
- [ ] signGoldenStaking (verify calculation)
- [ ] signPresaleStaking (verify calculation)
- [ ] signPublicStaking (verify calculation)
- [ ] signPreRegistrationUsername
- [ ] signRegistrationUsername
- [ ] signMakeOffer
- [ ] signWithdrawOffer
- [ ] signAcceptOffer
- [ ] signRenewUsername
- [ ] signAddCustomMetadata
- [ ] signRemoveCustomMetadata
- [ ] signFlushCustomMetadata
- [ ] signFlushUsername
- [ ] signMakeOrder
- [ ] signCancelOrder
- [ ] signDispatchOrderFillProportionalFee
- [ ] signDispatchOrderFillFixedFee

### Transaction Executors (19+ total)
- [ ] executePay
- [ ] executeDispersePay
- [ ] executePayMultiple
- [ ] executeGoldenStaking
- [ ] executePresaleStaking
- [ ] executePublicStaking
- [ ] executePublicServiceStaking
- [ ] executePreRegistrationUsername
- [ ] executeRegistrationUsername
- [ ] executeMakeOffer
- [ ] executeWithdrawOffer
- [ ] executeAcceptOffer
- [ ] executeRenewUsername
- [ ] executeAddCustomMetadata
- [ ] executeRemoveCustomMetadata
- [ ] executeFlushCustomMetadata
- [ ] executeFlushUsername
- [ ] executeMakeOrder
- [ ] executeCancelOrder
- [ ] executeDispatchOrderProportional
- [ ] executeDispatchOrderFixed

## Staking Calculations Reference

From EVVM documentation:
- **1 sMATE** (staking unit) = **5083 MATE tokens**
- This applies to:
  - Golden Staking
  - Public Staking
- Presale Staking: Fixed 1 MATE (1 * 10^18 wei)

### Implementation:
```typescript
// Golden & Public Staking
const amountOfToken = BigInt(amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

// Presale Staking
const amountOfToken = (1 * 10 ** 18).toLocaleString('fullwide', { useGrouping: false });
```

## Critical Notes

1. **NO DEPLOYMENT FEATURES** - This is now a pure frontend tool
2. **Contract Discovery** - All addresses come from EVVM contract or user input
3. **Exact Patterns** - Must match EVVM-Signature-Constructor-Front exactly
4. **Library Usage** - All signatures use @evvm/viem-signature-library
5. **Staking Calculations** - Must be exact: 5083 MATE per sMATE

## Success Criteria

- ✅ No deployment functionality exists
- ✅ Frontend loads EVVM address from .env
- ✅ Contract addresses discovered from EVVM
- ✅ All 19+ signature constructors present and correct
- ✅ All 19+ executors present and correct
- ✅ Staking calculations are exact
- ✅ .env validation works
- ✅ README accurately describes the tool
- ✅ CLAUDE.md is updated
- ✅ No deployment documentation exists

## Timeline Estimate

- Phase 1: 15 min
- Phase 2: 30 min
- Phase 3: 45 min
- Phase 4: 30 min
- Phase 5: 30 min
- Phase 6: 15 min
- Phase 7: 30 min
- Phase 8: 15 min
- Phase 9: 15 min
- Phase 10: 30 min

**Total: ~4 hours**
