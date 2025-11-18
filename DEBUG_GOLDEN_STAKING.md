# Golden Staking Signature Debug Guide

## ✅ Authorization Confirmed

You ARE the golden fisher (`0x9c77...6e45`), so authorization is NOT the issue.

The problem is likely one of these:

## Possible Issues

### 1. **EVVM Balance Insufficient**
The signature authorizes payment from your EVVM account to the staking contract.

**Check your EVVM balance**:
- Go to Status page
- Look at "EVVM Balance (MATE)"
- You need at least: **5,083 MATE** for 1 golden fisher

**If insufficient**:
- Use the Payments page to deposit MATE to your EVVM account first
- Send MATE tokens to yourself (from wallet → EVVM internal ledger)

### 2. **Wrong Nonce Used**
The signature must use a valid nonce.

**For SYNC nonces (priority: low)**:
- Must be sequential: 0, 1, 2, 3...
- Get current nonce from contract: `getNextCurrentSyncNonce(your_address)`
- Each failed transaction CONSUMES the nonce
- Cannot reuse nonces

**For ASYNC nonces (priority: high)**:
- Must be a random number you haven't used before
- Each address tracks used async nonces separately
- Use "Generate Random" button or timestamp

### 3. **Signature Doesn't Match Expected Message**
The contract verifies the signature against this exact message:

```
evvmID,pay,stakingAddress,mateToken,amount,priorityFee,nonce,priorityFlag,executor
```

**For your transaction (1 golden fisher)**:
```
1054,pay,0xa9a33070375969758ae5e663aa47f82c886affd9,0x0000000000000000000000000000000000000001,5083000000000000000000,0,YOUR_NONCE,PRIORITY_FLAG,0xa9a33070375969758ae5e663aa47f82c886affd9
```

Where:
- `YOUR_NONCE` = the nonce you entered
- `PRIORITY_FLAG` = "true" if you selected High, "false" if you selected Low

**This message is then signed with EIP-191** (automatically by `walletClient.signMessage()`)

### 4. **Nonce Already Used in EVVM**
Even if the signature is valid, if the nonce was already consumed by a previous transaction (even a failed one), the contract will reject it.

## Debugging Steps

### Step 1: Check Your EVVM Balance

1. Go to `/evvm/status` page
2. Click "Load My Data"
3. Verify EVVM Balance ≥ 5,083 MATE

**If insufficient**: Deposit MATE first using Payments page

### Step 2: Check Your Current Nonce

**For SYNC mode**:
1. On Status page, see "Next Nonce"
2. OR check contract directly: `EVVM.getNextCurrentSyncNonce(0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45)`

**For ASYNC mode**:
1. Use a random number you haven't used before
2. Suggested: Use timestamp or "Generate Random" button

### Step 3: Verify Signature Creation

Before clicking Execute, check the "Data Display" section shows:

```json
{
  "PayInputData": {
    "from": "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45",
    "to_address": "0xA9a33070375969758aE5e663aa47F82C886AffD9",
    "to_identity": "",
    "token": "0x0000000000000000000000000000000000000001",
    "amount": "5083000000000000000000",
    "priorityFee": "0",
    "nonce": "YOUR_NONCE_HERE",
    "priority": true/false,
    "executor": "0xA9a33070375969758aE5e663aa47F82C886AffD9",
    "signature": "0x..."
  },
  "GoldenStakingInputData": {
    "isStaking": true,
    "amountOfStaking": "1",
    "signature_EVVM": "0x..."
  }
}
```

### Step 4: Console Logs

Open browser console (F12) and look for these logs when creating signature:

```
Executing pay with args: {
  from: "0x9c77...",
  to_address: "0xA9a33070...",
  ...
  nonce: "?",
  priority: true/false,
  ...
}
```

The nonce and priority values here should match what you entered.

## Most Likely Issues (In Order)

### 1. **Insufficient EVVM Balance** (Most Common)
- You have wallet MATE but not EVVM MATE
- Solution: Deposit MATE to EVVM account first

### 2. **Sync Nonce Already Used**
- You're using nonce that was consumed by previous failed transaction
- Solution: Use next available nonce OR switch to async mode

### 3. **Wrong Priority Flag**
- Signature was created with "low" but you're trying to use sync nonce that's already consumed
- Solution: Switch to "high" (async) and use random nonce

## Recommended Next Attempt

1. **Select Priority: High (Async)**
2. **Click "Generate Random →"** for nonce (should generate something like 789456123)
3. **Enter 1** for number of fishers
4. **Click "Create signature"**
5. **Check Data Display** - verify all values look correct
6. **Click "Execute"**

This avoids all sync nonce issues by using a fresh random async nonce.

## Contract Validation Logic

The golden staking contract does this:

```solidity
function goldenStaking(
    bool isStaking,
    uint256 amountOfStaking,
    bytes memory signature_EVVM
) external {
    // 1. Check caller is golden fisher
    require(msg.sender == goldenFisher, "Not golden fisher");

    // 2. Calculate MATE amount
    uint256 mateAmount = amountOfStaking * 5083 * 1e18;

    // 3. Verify signature and execute EVVM.pay()
    // This is where it fails if:
    //   - Signature doesn't match expected message
    //   - Nonce already used
    //   - Insufficient EVVM balance
    //   - Signature invalid

    // 4. Update staking state
}
```

Since you ARE the golden fisher (step 1 passes), the failure is in step 3.

## What to Check

**Please provide**:
1. Your current EVVM balance (from Status page)
2. What priority you selected (Low or High)
3. What nonce you entered
4. The signature that was generated (from Data Display)
5. Any console errors

This will help pinpoint the exact issue!
