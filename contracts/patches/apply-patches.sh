#!/bin/bash
# Apply local patches to Testnet-Contracts submodule
# Run this after updating the submodule to reapply custom modifications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBMODULE_DIR="$SCRIPT_DIR/../lib/Testnet-Contracts"

echo "🔧 Applying patches to Testnet-Contracts submodule..."

cd "$SUBMODULE_DIR"

# Check if already applied
if git diff --quiet scripts/evvm-init.ts; then
  # Apply RPC fallback patch
  if [ -f "$SCRIPT_DIR/rpc-fallback-registry.patch" ]; then
    echo "📝 Applying RPC fallback patch..."
    git apply "$SCRIPT_DIR/rpc-fallback-registry.patch"
    echo "✅ RPC fallback patch applied successfully"
  else
    echo "⚠️  Patch file not found: rpc-fallback-registry.patch"
    exit 1
  fi
else
  echo "ℹ️  Patch already applied or file has local changes"
fi

echo "✅ All patches applied!"
