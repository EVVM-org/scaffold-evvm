# Testnet-Contracts Patches

This directory contains local modifications to the Testnet-Contracts submodule that enhance functionality without requiring a fork.

## What's Patched

### `rpc-fallback-registry.patch`
Adds RPC endpoint fallback logic to Registry EVVM registration.

**Problem:** Registry registration fails if the primary Ethereum Sepolia RPC (0xrpc.io) is unavailable.

**Solution:** Automatically tries 6 RPC endpoints in sequence:
1. `process.env.RPC_URL_ETH_SEPOLIA` (from .env)
2. `ethereum-sepolia.rpc.subquery.network/public`
3. `ethereum-sepolia.gateway.tatum.io`
4. `sepolia.drpc.org`
5. `gateway.tenderly.co/public/sepolia`

**Modified file:** `scripts/evvm-init.ts` - `registerWithRegistry()` function

## Usage

### After Submodule Update
If you update the Testnet-Contracts submodule and lose the patches:

```bash
cd contracts/patches
./apply-patches.sh
```

### Check Patch Status
```bash
cd contracts/lib/Testnet-Contracts
git diff scripts/evvm-init.ts
```

### Restore Clean Submodule
If you want to remove patches and return to upstream version:

```bash
cd contracts/lib/Testnet-Contracts
git restore scripts/evvm-init.ts
```

Then reapply when needed:
```bash
cd contracts/patches
./apply-patches.sh
```

## Why Patches?

**Avoids:**
- Maintaining a fork of Testnet-Contracts
- Submitting PRs for local improvements
- Dealing with upstream merge conflicts

**Maintains:**
- Clean separation between upstream and local changes
- Easy reapplication after submodule updates
- Documentation of what changed and why

## Future Patches

To create new patches:

```bash
cd contracts/lib/Testnet-Contracts

# Make your changes to any file
# Then create a patch:
git diff path/to/file.ts > ../../patches/my-feature.patch

# Add patch application to apply-patches.sh
```
