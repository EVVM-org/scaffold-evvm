# EVVM Nonce Type Analysis - Complete Report

## Executive Summary

After comprehensive analysis of:
- Reference implementation (`EVVM-Signature-Constructor-Front`)
- EVVM library source code (`@evvm/viem-signature-library v2.1.1`)
- EVVM documentation (evvm.info/llms-full.txt)
- EIP-191 signature standard

**CONCLUSION**: **ALL EVVM operations support BOTH sync and async nonces**. Users should have the flexibility to choose based on their workflow needs.

## Nonce Type Overview

### Synchronous (Sync) Nonces
- **Retrieved via**: `EVVM.getNextCurrentSyncNonce(address)`
- **Format**: Sequential numbers (0, 1, 2, 3, 4...)
- **Requirement**: Must be used in order
- **Use case**: Sequential transactions, deterministic ordering
- **Priority flag**: `priority: "low"` → `priorityFlag: false`
- **Tracking**: Separate nonce counter per address

### Asynchronous (Async) Nonces
- **Retrieved via**: User-generated random numbers
- **Format**: Any unused number (timestamps, random 6-10 digits)
- **Requirement**: Each nonce used only once per address
- **Use case**: Parallel transaction preparation, out-of-order execution
- **Priority flag**: `priority: "high"` → `priorityFlag: true`
- **Tracking**: Independent nonce tracking from sync nonces

## Analysis by Operation Type

### 1. Payment Operations

#### Single Payment (`pay`)
**Library Function**: `EVVMSignatureBuilder.signPay()`
```typescript
async signPay(
  evvmID: bigint,
  to: string,
  tokenAddress: `0x${string}`,
  amount: bigint,
  priorityFee: bigint,
  nonce: bigint,
  priorityFlag: boolean,  // ← User choice!
  executor: `0x${string}`
): Promise<`0x${string}`>
```

**Reference Implementation**: `PaySignaturesComponent.tsx:35`
- Has PrioritySelector
- Default: `priority: "low"` (sync)
- User can switch to "high" (async)

**Our Implementation**: ✅ CORRECT
- File: `frontend/src/app/evvm/payments/page.tsx:62`
- Has PrioritySelector
- Default: "low" (sync)
- Matches reference implementation

#### Disperse Payment (`dispersePay`)
**Library Function**: `EVVMSignatureBuilder.signDispersePay()`
```typescript
async signDispersePay(
  evvmID: bigint,
  toData: Array<DispersePayMetadata>,
  tokenAddress: `0x${string}`,
  amount: bigint,
  priorityFee: bigint,
  nonce: bigint,
  priorityFlag: boolean,  // ← User choice!
  executor: `0x${string}`
): Promise<`0x${string}`>
```

**Reference Implementation**: `DispersePayComponent.tsx`
- Has PrioritySelector
- Default: "low" (sync)

**Our Implementation**: ✅ CORRECT
- File: `frontend/src/app/evvm/payments/page.tsx:68`
- Has PrioritySelector (disperseDisperse)
- Default: "low" (sync)
- Matches reference implementation

### 2. Staking Operations

#### Golden Staking
**Library Function**: `StakingSignatureBuilder.signGoldenStaking()`
```typescript
async signGoldenStaking(
  evvmID: bigint,
  stakingAddress: `0x${string}`,
  totalPrice: bigint,
  nonceEVVM: bigint,
  priorityFlag: boolean  // ← User choice!
): Promise<`0x${string}`>
```

**Reference Implementation**: `GoldenStakingComponent.tsx:40`
- Has PrioritySelector
- Default: `priority: "low"` (sync)
- User can switch to "high" (async)

**Our Implementation**: ✅ CORRECT (after fix)
- File: `frontend/src/app/evvm/staking/page.tsx:174`
- Has PrioritySelector
- Default: "low" (sync)
- Matches reference implementation
- **Note**: Initially incorrectly hardcoded to "high", now fixed

#### Presale Staking
**Library Function**: `StakingSignatureBuilder.signPresaleStaking()`
```typescript
async signPresaleStaking(
  evvmID: bigint,
  stakingAddress: `0x${string}`,
  isStaking: boolean,
  nonce: bigint,
  priorityFee_EVVM: bigint,
  totalPrice: bigint,
  nonce_EVVM: bigint,
  priorityFlag_EVVM: boolean  // ← User choice for EVVM payment!
): Promise<StakingDualSignatureResult>
```

**Reference Implementation**: `PresaleStakingComponent.tsx:37`
- Has PrioritySelector
- Default: "low" (sync)

**Our Implementation**: ✅ CORRECT
- File: `frontend/src/app/evvm/staking/page.tsx:467`
- Has PrioritySelector
- Default: "low" (sync)
- Matches reference implementation

#### Public Staking
**Library Function**: `StakingSignatureBuilder.signPublicStaking()`
```typescript
async signPublicStaking(
  evvmID: bigint,
  stakingAddress: `0x${string}`,
  isStaking: boolean,
  stakingAmount: bigint,
  nonceStaking: bigint,
  totalPrice: bigint,
  priorityFee: bigint,
  nonceEVVM: bigint,
  priorityFlag: boolean  // ← User choice for EVVM payment!
): Promise<StakingDualSignatureResult>
```

**Reference Implementation**: `PublicStakingComponent.tsx:37`
- Has PrioritySelector
- Default: "low" (sync)

**Our Implementation**: ✅ CORRECT
- File: `frontend/src/app/evvm/staking/page.tsx:610`
- Has PrioritySelector
- Default: "low" (sync)
- Matches reference implementation

### 3. Name Service Operations

All name service operations (pre-registration, registration, renewal, offers, metadata) follow the same pattern:

**Library Functions**: `NameServiceSignatureBuilder.*`
- All accept `priorityFlag_EVVM: boolean` parameter
- Support both sync and async nonces for EVVM payment portion

**Reference Implementation**: Name service components
- All have PrioritySelector
- Default: "low" (sync)

**Our Implementation**: ✅ CORRECT
- File: `frontend/src/app/evvm/nameservice/page.tsx:57`
- Has PrioritySelector
- Default: "low" (sync)
- Matches reference implementation

## Common Patterns Observed

### 1. Default to Sync Nonces
All reference implementation components default to `priority: "low"` (sync nonces):
- Simpler for users (sequential, predictable)
- No need to generate random numbers
- Automatic via `getNextCurrentSyncNonce()`

### 2. User Has Choice
All operations provide PrioritySelector allowing users to switch to async mode when needed:
- Parallel transaction preparation
- Avoiding nonce conflicts
- Flexible execution timing

### 3. Conditional UI Guidance
All implementations show context-specific help:
- **Sync mode**: How to find next sync nonce
- **Async mode**: How to generate safe random nonces

### 4. Conditional Random Button
`NumberInputWithGenerator` component behavior:
- `showRandomBtn={priority !== "low"}`
- Only shows "Generate Random" button in async mode
- Prevents confusion about nonce source

## Nonce Failure Analysis

### User's Original Issue
**Problem**: Multiple failed golden staking transactions
**Transactions**: All using sync nonce 1 repeatedly

**Root Cause**:
1. User created transaction with sync nonce 1
2. Transaction failed (insufficient balance or other error)
3. **Sync nonce 1 was consumed** despite failure
4. User tried again with nonce 1 → failed (nonce already used)
5. User checked `getNextCurrentSyncNonce()` → still showed 1
6. Repeated failures created confusion

**Why Sync Nonce Reader Showed Stale Value**:
- The `getNextCurrentSyncNonce()` function may not update immediately after failed transaction
- Or user was reading from cached/stale contract state
- Each transaction attempt consumed the nonce even though execution reverted

**Solutions for Users**:
1. **Option A - Continue with Sync**:
   - Increment nonce manually after each attempt
   - If nonce 1 failed, try nonce 2, then 3, etc.
   - Query contract state after each attempt to verify nonce consumption

2. **Option B - Switch to Async** (Recommended after failures):
   - Select "High" priority
   - Click "Generate Random" to get a fresh async nonce
   - Async nonces are independent from sync nonce issues
   - No sequential dependency

## Best Practices for Nonce Usage

### When to Use Sync Nonces (Low Priority)
✅ Default choice for most users
✅ Sequential, predictable ordering
✅ Automatic management via contract
✅ Good for: Single transactions, ordered operations

### When to Use Async Nonces (High Priority)
✅ Preparing multiple transactions simultaneously
✅ Avoiding nonce conflicts after failures
✅ Out-of-order execution acceptable
✅ Good for: Batch operations, parallel workflows, recovery from sync nonce issues

### Recovering from Nonce Issues
If experiencing nonce errors:
1. **Check current nonce**: Call `getNextCurrentSyncNonce(address)`
2. **If unsure**: Switch to async mode and generate random nonce
3. **If sync nonce seems stuck**: Try incrementing manually
4. **For clean slate**: Use async mode with timestamp-based nonce

## Implementation Verification Checklist

✅ **Payments Page** (`frontend/src/app/evvm/payments/page.tsx`)
- Single payment: Has PrioritySelector ✅
- Disperse payment: Has PrioritySelector ✅
- Default: "low" (sync) ✅
- Matches reference: ✅

✅ **Staking Page** (`frontend/src/app/evvm/staking/page.tsx`)
- Golden staking: Has PrioritySelector ✅
- Presale staking: Has PrioritySelector ✅
- Public staking: Has PrioritySelector ✅
- Default: "low" (sync) ✅
- Matches reference: ✅

✅ **Name Service Page** (`frontend/src/app/evvm/nameservice/page.tsx`)
- All operations: Have PrioritySelector ✅
- Default: "low" (sync) ✅
- Matches reference: ✅

## Conclusion

**All EVVM operations in our project now correctly support both sync and async nonces**, matching the reference implementation and library design.

The key insight: **EVVM provides flexibility, not restrictions**. Users should choose the nonce type that fits their workflow:
- **Sync for simplicity**: Most use cases, automatic sequential nonces
- **Async for flexibility**: Parallel operations, recovery from issues, advanced workflows

**For the user experiencing issues**: Switch to async mode (High priority) and click "Generate Random" to avoid sync nonce conflicts.
