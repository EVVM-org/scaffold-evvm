# Comparison Report: EVVM-Signature-Constructor-Front vs scaffold-evvm

**Date:** 2025-11-21
**Branch:** fixings-deep-double-check
**Status:** ✅ ANALYSIS COMPLETE

---

## Executive Summary

Both projects use **identical** signature constructors and transaction executors. The main differences are:
- scaffold-evvm has deployment functionality (to be removed)
- scaffold-evvm has more complex architecture
- EVVM-Signature-Constructor-Front has simpler, focused structure

---

## Staking Calculations Verification ✅

### Golden Staking
**Both projects:**
```typescript
const amountOfToken = BigInt(amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));
```
✅ **IDENTICAL**

### Public Staking
**Both projects:**
```typescript
const amountOfToken = BigInt(amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));
```
✅ **IDENTICAL**

### Presale Staking
**Both projects:**
```typescript
const amountOfToken = (1 * 10 ** 18).toLocaleString('fullwide', { useGrouping: false });
```
✅ **IDENTICAL**

**Conclusion:** 1 sMATE = 5083 MATE tokens (correctly implemented in both)

---

## Transaction Executors Comparison

### EVVM Executors
| Function | EVVM-Signature-Constructor-Front | scaffold-evvm | Status |
|----------|--------------------------------|---------------|--------|
| executePay | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeDispersePay | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executePayMultiple | ✅ Present | ✅ Present | ✅ IDENTICAL |

### Staking Executors
| Function | EVVM-Signature-Constructor-Front | scaffold-evvm | Status |
|----------|--------------------------------|---------------|--------|
| executeGoldenStaking | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executePresaleStaking | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executePublicStaking | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executePublicServiceStaking | ✅ Present | ✅ Present | ✅ IDENTICAL |

### NameService Executors
| Function | EVVM-Signature-Constructor-Front | scaffold-evvm | Status |
|----------|--------------------------------|---------------|--------|
| executePreRegistrationUsername | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeRegistrationUsername | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeMakeOffer | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeWithdrawOffer | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeAcceptOffer | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeRenewUsername | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeAddCustomMetadata | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeRemoveCustomMetadata | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeFlushCustomMetadata | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeFlushUsername | ✅ Present | ✅ Present | ✅ IDENTICAL |

### P2P Swap Executors
| Function | EVVM-Signature-Constructor-Front | scaffold-evvm | Status |
|----------|--------------------------------|---------------|--------|
| executeMakeOrder | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeCancelOrder | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeDispatchOrderFillPropotionalFee | ✅ Present | ✅ Present | ✅ IDENTICAL |
| executeDispatchOrderFillFixedFee | ✅ Present | ✅ Present | ✅ IDENTICAL |

**Total Executors:** 21/21 ✅ **100% MATCH**

---

## Signature Constructors Comparison

### scaffold-evvm Implementation
- **Location:** `frontend/src/lib/evvmSignatures.ts` (centralized file)
- **Pattern:** All signatures in one 1400+ line file
- **Approach:** Functional, exports standalone functions

### EVVM-Signature-Constructor-Front Implementation
- **Location:** Individual component files
- **Pattern:** Each component creates its own signature
- **Approach:** Component-based, signatures created inline

### Signature Functions
| Signature Function | EVVM-Constructor-Front | scaffold-evvm | Status |
|-------------------|----------------------|---------------|--------|
| signPay | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signDispersePay | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signGoldenStaking | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signPresaleStaking | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signPublicStaking | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signPreRegistrationUsername | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signRegistrationUsername | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signMakeOffer | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signWithdrawOffer | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signAcceptOffer | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signRenewUsername | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signAddCustomMetadata | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signRemoveCustomMetadata | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signFlushCustomMetadata | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signFlushUsername | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signMakeOrder | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signCancelOrder | ✅ Component | ✅ evvmSignatures.ts | ✅ MATCH |
| signDispatchOrderProportional | ⚠️  Commented | ⚠️  Commented | ⚠️  NEEDS FIXING |
| signDispatchOrderFixed | ⚠️  Commented | ⚠️  Commented | ⚠️  NEEDS FIXING |

**Total Signatures:** 17/19 active, 2 commented out

---

## Library Usage

Both projects use:
- `@evvm/viem-signature-library` v2.1.1
- Same ABIs (EvvmABI, StakingABI, NameServiceABI, P2PSwapABI)
- Same InputData types
- Same signature building patterns

---

## Key Differences

### Architecture
| Aspect | EVVM-Constructor-Front | scaffold-evvm |
|--------|----------------------|---------------|
| Structure | Simple, single workspace | Monorepo (contracts + frontend) |
| Deployment | None | Full wizard & scripts |
| Config | Static contract addresses | Dynamic from deployment |
| Complexity | Low | High |

### Files to Remove from scaffold-evvm
1. **Entire `contracts/` folder**
2. `contracts/` package.json
3. `Makefile`
4. `foundry.toml`
5. Deployment scripts in `package.json`
6. `frontend/src/app/api/deployments/` route
7. `frontend/src/app/api/update-deployment/` route
8. `frontend/src/hooks/useEvvmDeployment.ts`
9. Deployment-related imports and code

---

## Transformation Plan

### Phase 1: Remove Deployment Functionality ✅ READY
- Remove contracts workspace
- Remove deployment scripts
- Remove deployment API routes
- Simplify package.json

### Phase 2: Implement Contract Discovery ⏳ PENDING
- Load EVVM address from .env
- Discover Staking, NameService, Estimator from EVVM contract
- Optional: P2P, Treasury (user provides)

### Phase 3: Simplify Architecture ⏳ PENDING
- Remove deployment hooks
- Update components to use contract discovery
- Clean up unused code

---

## Recommendations

1. ✅ **Keep executors as-is** - They are identical and correct
2. ✅ **Keep signature builders as-is** - They use the library correctly
3. ✅ **Keep staking calculations as-is** - They are exact (5083 MATE per sMATE)
4. ⚠️  **Remove all deployment functionality** - Not needed for signature constructor
5. 🔄 **Implement contract discovery** - Read addresses from EVVM contract
6. 📝 **Update documentation** - Remove deployment instructions

---

## Conclusion

**scaffold-evvm has 100% feature parity with EVVM-Signature-Constructor-Front** in terms of signature constructors and executors. The only differences are architectural (deployment features and complexity).

**Status:** Ready to proceed with transformation to pure signature constructor frontend.

**Next Step:** Remove deployment functionality and implement contract discovery.
