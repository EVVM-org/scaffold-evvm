/**
 * COMPREHENSIVE GOLDEN STAKING DIAGNOSTIC TEST
 * Run this in browser console at localhost:3000
 *
 * This will help identify the exact issue with golden staking on Arbitrum Sepolia
 */

(async function() {
  console.log("=== GOLDEN STAKING DIAGNOSTIC TEST ===\n");

  // Configuration
  const evvmID = "1060";
  const stakingAddress = "0x44dbe1335f239034a8c07c065fc64fb13f42e1de";
  const goldenFisher = "0x9c77c6fafc1eb0821F1De12972Ef0199C97C6e45";
  const mateToken = "0x0000000000000000000000000000000000000001";
  const evvmAddress = "0x1c95da298e99fb478c30823afa7b59a0ff7b99df";

  // Test 1: Check balances
  console.log("1. Checking EVVM balances...");
  try {
    const { readContract } = await import('@wagmi/core');
    const { config } = await import('@/config');
    const { EvvmABI } = await import('@evvm/viem-signature-library');

    const balance = await readContract(config, {
      address: evvmAddress,
      abi: EvvmABI,
      functionName: 'getBalance',
      args: [goldenFisher, mateToken]
    });

    console.log(`   Golden Fisher MATE balance: ${balance} wei`);
    console.log(`   = ${Number(balance) / 1e18} MATE\n`);

    if (Number(balance) < 5083e18) {
      console.error("   ❌ INSUFFICIENT BALANCE!");
      return;
    }
    console.log("   ✅ Balance is sufficient\n");
  } catch (error) {
    console.error("   Error checking balance:", error);
  }

  // Test 2: Check nonce
  console.log("2. Checking sync nonce...");
  try {
    const { readContract } = await import('@wagmi/core');
    const { config } = await import('@/config');
    const { EvvmABI } = await import('@evvm/viem-signature-library');

    const nonce = await readContract(config, {
      address: evvmAddress,
      abi: EvvmABI,
      functionName: 'getNextCurrentSyncNonce',
      args: [goldenFisher]
    });

    console.log(`   Current sync nonce: ${nonce}\n`);

    if (nonce !== 0n && nonce !== "0") {
      console.warn(`   ⚠️  Nonce is not 0! You must use nonce ${nonce} in your signature\n`);
    } else {
      console.log("   ✅ Nonce is 0\n");
    }
  } catch (error) {
    console.error("   Error checking nonce:", error);
  }

  // Test 3: Create and verify signature
  console.log("3. Creating test signature...");
  try {
    const { getWalletClient, getAccount } = await import('@wagmi/core');
    const { config } = await import('@/config');
    const { EVVMSignatureBuilder } = await import('@evvm/viem-signature-library');

    const account = getAccount(config);
    const walletClient = await getWalletClient(config);

    if (!account.address) {
      console.error("   ❌ No wallet connected!");
      return;
    }

    if (account.address.toLowerCase() !== goldenFisher.toLowerCase()) {
      console.warn(`   ⚠️  Warning: Connected wallet (${account.address}) is not Golden Fisher!`);
      console.warn(`   Please connect ${goldenFisher} to test properly\n`);
    }

    const evvmBuilder = new EVVMSignatureBuilder(walletClient, account);

    const amountOfFishers = 1;
    const amountOfMate = BigInt(amountOfFishers) * (BigInt(5083) * BigInt(10) ** BigInt(18));

    console.log(`   Amount calculation:`);
    console.log(`   - Fishers: ${amountOfFishers}`);
    console.log(`   - MATE per fisher: 5,083`);
    console.log(`   - Total MATE (wei): ${amountOfMate}`);
    console.log(`   - Total MATE: ${Number(amountOfMate) / 1e18}\n`);

    console.log("   Constructing signature message...");
    console.log(`   Message format: {evvmID},pay,{to},{token},{amount},{priorityFee},{nonce},{priorityFlag},{executor}`);

    const messageComponents = {
      evvmID,
      action: "pay",
      to: stakingAddress.toLowerCase(),
      token: mateToken,
      amount: amountOfMate.toString(),
      priorityFee: "0",
      nonce: "0",  // MUST match current sync nonce
      priorityFlag: "false",  // MUST be false for golden staking
      executor: stakingAddress.toLowerCase()
    };

    const expectedMessage = `${messageComponents.evvmID},${messageComponents.action},${messageComponents.to},${messageComponents.token},${messageComponents.amount},${messageComponents.priorityFee},${messageComponents.nonce},${messageComponents.priorityFlag},${messageComponents.executor}`;

    console.log(`   Expected message:\n   ${expectedMessage}\n`);

    console.log("   Signing message...");
    const signature = await evvmBuilder.signPay(
      BigInt(evvmID),
      stakingAddress,
      mateToken,
      amountOfMate,
      BigInt(0),  // priorityFee
      BigInt(0),  // nonce
      false,      // priorityFlag
      stakingAddress
    );

    console.log(`   Signature: ${signature}\n`);

    // Verify signature
    console.log("   Verifying signature...");
    const { verifyMessage } = await import('viem');

    const isValid = await verifyMessage({
      address: account.address,
      message: expectedMessage,
      signature
    });

    if (isValid) {
      console.log("   ✅ Signature is valid!\n");
    } else {
      console.error("   ❌ Signature verification FAILED!\n");
      console.error("   This means the library is not constructing the message correctly.");
      console.error("   Expected message:", expectedMessage);
      return;
    }
  } catch (error) {
    console.error("   Error creating signature:", error);
  }

  // Test 4: Simulate the pay call directly
  console.log("4. Simulating EVVM.pay() call...");
  console.log("   (This test requires you to manually test the pay function)\n");
  console.log("   Try calling EVVM.pay() directly with these parameters:");
  console.log(`   - from: ${goldenFisher}`);
  console.log(`   - to_address: ${stakingAddress}`);
  console.log(`   - to_identity: ""`);
  console.log(`   - token: ${mateToken}`);
  console.log(`   - amount: ${BigInt(1) * (BigInt(5083) * BigInt(10) ** BigInt(18))}`);
  console.log(`   - priorityFee: 0`);
  console.log(`   - nonce: 0`);
  console.log(`   - priorityFlag: false`);
  console.log(`   - executor: ${stakingAddress}`);
  console.log(`   - signature: [your signature from step 3]\n`);

  console.log("=== DIAGNOSTIC TEST COMPLETE ===\n");
  console.log("Summary:");
  console.log("- If balance is insufficient: Deposit MATE tokens to EVVM first");
  console.log("- If nonce is wrong: Use the current sync nonce shown above");
  console.log("- If signature is invalid: Check the library version and implementation");
  console.log("- If everything passes but transaction still fails: Check contract deployment\n");

})();
