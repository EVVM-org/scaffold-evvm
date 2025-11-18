# 📊 Deployment Data Flow - Developer Guide

## Overview

**The New Scaffold-EVVM** uses a completely **dynamic data flow** with **ZERO hardcoded values**. Every deployment generates unique contract addresses and EVVM IDs that are automatically captured and made available to the frontend.

---

## 🔄 Complete Data Flow

```
User runs: npm run wizard
        ↓
┌───────────────────────────────────────────────────────┐
│  1. Scaffold-EVVM Wizard Wrapper                      │
│     (contracts/scripts/wizard.ts)                     │
│                                                        │
│     - Loads .env variables                            │
│     - Validates prerequisites                         │
│     - Passes env to Testnet-Contracts wizard          │
└───────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────┐
│  2. Testnet-Contracts Wizard                          │
│     (contracts/lib/Testnet-Contracts/scripts/)        │
│                                                        │
│     - Prompts user for configuration                  │
│     - Deploys 6 EVVM contracts to blockchain          │
│     - Optionally registers with Registry EVVM         │
│     - Optionally sets EVVM ID on contract             │
│                                                        │
│     Generates:                                        │
│     ✓ input/address.json                              │
│     ✓ input/evvmBasicMetadata.json                    │
│     ✓ input/evvmAdvancedMetadata.json                 │
│     ✓ broadcast/.../run-latest.json                   │
└───────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────┐
│  3. Generate Deployment Summary                       │
│     (contracts/scripts/wizard.ts)                     │
│                                                        │
│     Reads DYNAMIC data from:                          │
│     📁 Broadcast files    → Contract addresses        │
│     ⛓️  Blockchain          → EVVM ID (getEvvmID())    │
│     📝 Input files        → User configuration        │
│                                                        │
│     Generates:                                        │
│     ✓ contracts/input/evvmDeploymentSummary.json      │
└───────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────┐
│  4. Frontend Loads Deployment                         │
│     (frontend/src/hooks/useEvvmDeployment.ts)         │
│                                                        │
│     - Fetches /api/deployments                        │
│     - API reads evvmDeploymentSummary.json            │
│     - Hook provides data to all pages                 │
└───────────────────────────────────────────────────────┘
        ↓
        Frontend displays:
        ✓ Contract addresses
        ✓ EVVM ID (unique per deployment)
        ✓ Network information
        ✓ Admin addresses
```

---

## 📂 Data Sources (All Dynamic)

### 1. Contract Addresses (From Broadcast Files)

**Source**: `contracts/lib/Testnet-Contracts/broadcast/DeployTestnet.s.sol/{chainId}/run-latest.json`

**How it works**:
- Foundry generates this file during `forge script` deployment
- Contains transaction receipts with deployed contract addresses
- Wizard reads `contractAddress` from each transaction

**Contracts extracted**:
```json
{
  "Evvm": "0x...",          // Main EVVM contract
  "NameService": "0x...",   // Name resolution
  "Staking": "0x...",       // Staking & rewards
  "Estimator": "0x...",     // Reward calculations
  "Treasury": "0x...",      // Asset management
  "P2PSwap": "0x..."        // P2P trading
}
```

**Code**: `wizard.ts` lines 154-188

---

### 2. EVVM ID (From Blockchain)

**Source**: Live blockchain call to deployed EVVM contract

**How it works**:
```typescript
const evvmId = await publicClient.readContract({
  address: evvmAddress,      // From broadcast file
  abi: [{
    name: 'getEvvmID',
    type: 'function',
    outputs: [{ type: 'uint256' }]
  }],
  functionName: 'getEvvmID'
});
```

**Important**:
- ✓ EVVM ID is **unique per deployment**
- ✓ Assigned by Registry EVVM (starts from 1000+)
- ✓ Read from blockchain, **never hardcoded**
- ✓ Will be `0` if not yet registered/activated

**Code**: `wizard.ts` lines 191-205, 221-263

---

### 3. User Configuration (From Input Files)

**Source**: `contracts/lib/Testnet-Contracts/input/`

Generated by Testnet-Contracts wizard during configuration phase.

#### address.json
```json
{
  "admin": "0x...",         // User's admin address
  "goldenFisher": "0x...",  // Fisher address (unrestricted staking)
  "activator": "0x..."      // Activator address (system control)
}
```

#### evvmBasicMetadata.json
```json
{
  "EvvmName": "MyEVVM",           // User-chosen name
  "principalTokenName": "My Token",
  "principalTokenSymbol": "MTK"
}
```

**Code**: `wizard.ts` lines 135-152

---

### 4. Network Information (Derived)

**Source**: Calculated from chain ID in broadcast files

```typescript
const networkMap: Record<number, string> = {
  11155111: 'Ethereum Sepolia',
  421614: 'Arbitrum Sepolia',
  31337: 'Local Anvil'
};
```

**Code**: `wizard.ts` lines 165-171

---

## 🎯 Final Output

### evvmDeploymentSummary.json

**Location**: `contracts/input/evvmDeploymentSummary.json`

**Structure**:
```json
{
  "chainId": 11155111,                    // From broadcast
  "networkName": "Ethereum Sepolia",      // Mapped from chainId
  "evvm": "0x...",                        // From broadcast
  "nameService": "0x...",                 // From broadcast
  "staking": "0x...",                     // From broadcast
  "estimator": "0x...",                   // From broadcast
  "treasury": "0x...",                    // From broadcast
  "p2pSwap": "0x...",                     // From broadcast
  "evvmID": 1048,                         // From blockchain ⛓️
  "evvmName": "MyEVVM",                   // From user input
  "registry": "0x389dC8fb...",            // Constant (same for all)
  "admin": "0x...",                       // From user input
  "goldenFisher": "0x...",                // From user input
  "activator": "0x..."                    // From user input
}
```

**Note**: Only `registry` is constant (same Registry contract for all deployments on Sepolia). Everything else is deployment-specific.

---

## 🔄 Refreshing Deployment Info

If the EVVM ID is updated manually (via Registry or contract call), refresh the deployment summary:

```bash
cd contracts && npm run refresh
```

**What it does**:
1. Reads current `evvmDeploymentSummary.json`
2. Calls `getEvvmID()` on the blockchain
3. Compares values
4. Updates JSON if different

**Script**: `contracts/scripts/refresh-deployment.ts`

---

## 🌐 Frontend Integration

### API Route

**File**: `frontend/src/app/api/deployments/route.ts`

```typescript
export async function GET() {
  const summaryPath = path.join(
    process.cwd(), '..', 'contracts', 'input',
    'evvmDeploymentSummary.json'
  );

  const deployment = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  return NextResponse.json([deployment]); // Returns array
}
```

### React Hook

**File**: `frontend/src/hooks/useEvvmDeployment.ts`

```typescript
export function useEvvmDeployment() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);

  useEffect(() => {
    const response = await fetch('/api/deployments', {
      cache: 'no-store'  // Always get fresh data
    });
    const data = await response.json();
    setDeployment(Array.isArray(data) ? data[0] : data);
  }, []);

  return { deployment, loading, error };
}
```

### Usage in Components

```typescript
function MyComponent() {
  const { deployment, loading, error } = useEvvmDeployment();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>{deployment.evvmName}</h1>
      <p>EVVM ID: {deployment.evvmID}</p>
      <p>Network: {deployment.networkName}</p>
      <p>EVVM Address: {deployment.evvm}</p>
    </div>
  );
}
```

---

## 🔐 No Hardcoded Values!

### ✅ What IS Dynamic (Unique per deployment)

- ✓ All contract addresses (from broadcast files)
- ✓ EVVM ID (from blockchain)
- ✓ Chain ID (from deployment)
- ✓ Network name (derived from chain ID)
- ✓ EVVM name (from user input)
- ✓ Admin addresses (from user input)

### ⚠️ What IS Constant (Same for everyone)

- Registry EVVM address: `0x389dC8fb09211bbDA841D59f4a51160dA2377832`
  - This is the official Registry contract on Ethereum Sepolia
  - All EVVM deployments register with the same Registry

---

## 🧪 Testing the Flow

### Test 1: Deploy New EVVM

```bash
# 1. Deploy
npm run wizard

# 2. Check generated files
cat contracts/input/evvmDeploymentSummary.json

# 3. Verify EVVM ID matches blockchain
cd contracts && npm run refresh
```

### Test 2: Verify Addresses are Unique

```bash
# Deploy to different account or network
npm run wizard

# Each deployment will have:
# - Different contract addresses
# - Different EVVM ID
# - Different admin addresses
```

### Test 3: Frontend Updates

```bash
# 1. Start frontend
npm run dev

# 2. Navigate to http://localhost:3000
# 3. Verify deployment info displays correctly
# 4. Deploy new EVVM instance
# 5. Refresh browser - should show new deployment
```

---

## 🚨 Common Issues

### Issue: EVVM ID shows 0

**Cause**: EVVM not yet registered or activated

**Solution**:
1. Visit `/evvm/register` in frontend
2. Register with Registry EVVM
3. Set EVVM ID on contract
4. Run `npm run refresh` to update summary

### Issue: Contract addresses not showing

**Cause**: Broadcast files not found

**Solution**:
1. Ensure deployment completed successfully
2. Check `contracts/lib/Testnet-Contracts/broadcast/` exists
3. Re-run wizard if needed

### Issue: Frontend shows stale data

**Cause**: Browser cache or Next.js cache

**Solution**:
```bash
# 1. Refresh deployment summary
cd contracts && npm run refresh

# 2. Hard refresh browser (Ctrl+Shift+R)

# 3. Restart dev server
npm run dev
```

---

## 📝 For Framework Developers

If you're contributing to Scaffold-EVVM, remember:

### ✅ DO

- ✓ Read data from deployment artifacts
- ✓ Call blockchain for latest state
- ✓ Use relative paths for files
- ✓ Add error handling for missing data
- ✓ Document data sources in comments

### ❌ DON'T

- ✗ Hardcode contract addresses
- ✗ Hardcode EVVM IDs
- ✗ Cache deployment data indefinitely
- ✗ Assume specific chain IDs
- ✗ Skip validation of dynamic data

---

## 🔗 Key Files Reference

| File | Purpose | Data Type |
|------|---------|-----------|
| `contracts/scripts/wizard.ts` | Main wizard wrapper | Generator |
| `contracts/scripts/refresh-deployment.ts` | Refresh utility | Updater |
| `contracts/input/evvmDeploymentSummary.json` | Frontend data source | Output |
| `frontend/src/app/api/deployments/route.ts` | API endpoint | Server |
| `frontend/src/hooks/useEvvmDeployment.ts` | React hook | Client |

---

## 🎉 Summary

**Every deployment is unique and self-contained:**

1. ✓ User runs wizard
2. ✓ Contracts deployed to blockchain
3. ✓ Deployment artifacts generated
4. ✓ Wrapper reads addresses from artifacts
5. ✓ Wrapper reads EVVM ID from blockchain
6. ✓ Summary JSON generated
7. ✓ Frontend loads and displays unique data

**No manual configuration needed!** The framework automatically captures all deployment-specific information and makes it available to the frontend.

---

**Status**: ✅ Fully Dynamic Data Flow Implemented
