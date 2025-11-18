#!/bin/bash

echo "🔍 Checking Golden Fisher Authorization"
echo "========================================"
echo ""

STAKING_CONTRACT="0xA9a33070375969758aE5e663aa47F82C886AffD9"
USER_ADDRESS="0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45"
RPC_URL="https://sepolia.infura.io/v3/INFURA_KEY_HERE"

echo "Staking Contract: $STAKING_CONTRACT"
echo "Your Address: $USER_ADDRESS"
echo ""
echo "Querying contract for goldenFisher address..."
echo ""
echo "⚠️  You need to run this manually on Etherscan:"
echo "1. Go to: https://sepolia.etherscan.io/address/$STAKING_CONTRACT#readContract"
echo "2. Find function 'goldenFisher'"
echo "3. Click 'Query'"
echo "4. Compare the returned address with your address: $USER_ADDRESS"
echo ""
echo "If they MATCH → You're authorized ✅"
echo "If they DON'T MATCH → You CANNOT use golden staking ❌"
