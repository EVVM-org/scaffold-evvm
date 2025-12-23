'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { EvvmABI } from '@evvm/viem-signature-library';
import { getExplorerTxUrl } from '@/lib/evvmConfig';
import styles from '@/styles/pages/Faucet.module.css';

// Common token addresses in EVVM
const MATE_TOKEN = '0x0000000000000000000000000000000000000001';
const ETH_TOKEN = '0x0000000000000000000000000000000000000000';

/**
 * Converts a token amount string to BigInt with specified decimals
 * Avoids floating-point precision issues by using string manipulation
 *
 * @param amount - The amount as a string (e.g., "1000", "1000.5", "0.123")
 * @param decimals - Number of decimals (usually 18 for ERC20)
 * @returns BigInt representation in wei
 * @throws Error if amount is invalid
 *
 * @example
 * parseTokenAmount("1000", 18)  // Returns: 1000000000000000000000n
 * parseTokenAmount("5083", 18)  // Returns: 5083000000000000000000n (1 Golden Fisher)
 * parseTokenAmount("0.5", 18)   // Returns: 500000000000000000n
 * parseTokenAmount("1000.123456789012345678", 18) // Returns: 1000123456789012345678n
 */
function parseTokenAmount(amount: string, decimals: number): bigint {
  // Remove any whitespace and commas
  const cleanAmount = amount.trim().replace(/,/g, '');

  // Validate input
  if (!cleanAmount || cleanAmount === '.' || !/^[0-9.]+$/.test(cleanAmount)) {
    throw new Error('Invalid amount format');
  }

  // Split on decimal point
  const parts = cleanAmount.split('.');

  // Ensure only one decimal point
  if (parts.length > 2) {
    throw new Error('Invalid amount: multiple decimal points');
  }

  const [whole = '0', fraction = ''] = parts;

  // Handle empty whole part (e.g., ".5" -> "0.5")
  const wholePart = whole || '0';

  // Pad or truncate the fractional part to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);

  // Combine whole and fractional parts
  const combined = wholePart + paddedFraction;

  // Remove leading zeros (except if the number is just "0")
  const trimmed = combined.replace(/^0+/, '') || '0';

  // Convert to BigInt
  return BigInt(trimmed);
}

// Self-test function to verify parseTokenAmount is working correctly
// Run this in development to ensure accuracy
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const testCases = [
    { input: '1000', expected: '1000000000000000000000' },
    { input: '5083', expected: '5083000000000000000000' },
    { input: '0.5', expected: '500000000000000000' },
    { input: '0.000000000000000001', expected: '1' },
    { input: '10000.123', expected: '10000123000000000000000' },
  ];

  console.log('🧪 Testing parseTokenAmount function...');
  let allPassed = true;
  testCases.forEach(({ input, expected }) => {
    try {
      const result = parseTokenAmount(input, 18);
      const passed = result.toString() === expected;
      if (!passed) {
        console.error(`❌ FAILED: ${input} -> Expected ${expected}, got ${result.toString()}`);
        allPassed = false;
      } else {
        console.log(`✅ PASSED: ${input} -> ${result.toString()}`);
      }
    } catch (e: any) {
      console.error(`❌ ERROR: ${input} -> ${e.message}`);
      allPassed = false;
    }
  });
  if (allPassed) {
    console.log('✅ All parseTokenAmount tests passed!');
  } else {
    console.error('❌ Some parseTokenAmount tests failed!');
  }
}

export default function FaucetPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const { address, isConnected } = useAccount();

  const [recipient, setRecipient] = useState('');
  const [tokenAddress, setTokenAddress] = useState(MATE_TOKEN);
  const [amount, setAmount] = useState('1000');
  const [isExecuting, setIsExecuting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClaimTokens = async () => {
    if (!deployment || !isConnected || !address) {
      setError('Please connect your wallet and ensure deployment is loaded');
      return;
    }

    if (!recipient) {
      setError('Please enter a recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Validate amount is a valid number
    if (isNaN(parseFloat(amount))) {
      setError('Please enter a valid number');
      return;
    }

    // Validate amount doesn't have too many decimals
    const decimalPart = amount.split('.')[1];
    if (decimalPart && decimalPart.length > 18) {
      setError('Maximum 18 decimal places allowed');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Convert amount to BigInt properly (avoiding floating-point precision issues)
      let amountInWei: bigint;
      try {
        amountInWei = parseTokenAmount(amount, 18);
      } catch (conversionError: any) {
        setError(`Invalid amount: ${conversionError.message}`);
        setIsExecuting(false);
        return;
      }

      // Verify the conversion is correct (for safety)
      const verificationAmount = Number(amountInWei) / 1e18;
      const expectedAmount = parseFloat(amount);
      if (Math.abs(verificationAmount - expectedAmount) > 0.000001) {
        console.warn('⚠️ Amount conversion mismatch detected');
        console.warn('  Expected:', expectedAmount);
        console.warn('  Got:', verificationAmount);
        setError('Amount conversion error detected. Please check your input.');
        setIsExecuting(false);
        return;
      }

      console.log('🚰 Faucet Claim Details:');
      console.log('  Recipient:', recipient);
      console.log('  Token:', tokenAddress === MATE_TOKEN ? 'MATE' : 'ETH');
      console.log('  Amount (input):', amount);
      console.log('  Amount (wei):', amountInWei.toString());
      console.log('  Amount (verified):', verificationAmount.toLocaleString(), 'tokens');
      console.log('  ✅ Conversion verified successfully');

      // Call addBalance function on EVVM contract
      const hash = await writeContract(config, {
        abi: EvvmABI,
        address: deployment.evvm as `0x${string}`,
        functionName: 'addBalance',
        args: [recipient as `0x${string}`, tokenAddress as `0x${string}`, amountInWei],
      });

      setTxHash(hash);
      console.log('  Transaction Hash:', hash);

      // Wait for confirmation
      await waitForTransactionReceipt(config, { hash });

      const tokenName = tokenAddress === MATE_TOKEN ? 'MATE' : 'ETH';
      const formattedAmount = parseFloat(amount).toLocaleString();
      setSuccess(`Successfully sent ${formattedAmount} ${tokenName} to ${recipient.substring(0, 6)}...${recipient.substring(38)}`);
      // Reset form
      setRecipient('');
      setAmount('1000');
    } catch (err: any) {
      console.error('Error claiming tokens:', err);
      setError(err.message || 'Failed to claim tokens');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickFill = () => {
    if (address) {
      setRecipient(address);
    }
  };

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <h1>MATE Token Faucet</h1>
        <p>Loading deployment information...</p>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <h1>MATE Token Faucet</h1>
        <div className={styles.error}>
          <p>⚠️ No EVVM deployment found</p>
          <p>Please deploy an EVVM instance first using: <code>npm run wizard</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🚰 MATE Token Faucet</h1>
        <p>Claim test MATE tokens for development and testing</p>
      </div>

      <div className={styles.deploymentInfo}>
        <h3>Deployment Info</h3>
        <div className={styles.infoGrid}>
          <div><strong>Network:</strong> {deployment.networkName}</div>
          <div><strong>EVVM:</strong> {deployment.evvmName}</div>
          <div><strong>EVVM ID:</strong> {deployment.evvmID}</div>
          {deployment.admin && <div><strong>Admin:</strong> {deployment.admin}</div>}
        </div>
      </div>

      {!isConnected && (
        <div className={styles.warning}>
          <p>⚠️ Please connect your wallet to use the faucet</p>
        </div>
      )}

      {isConnected && deployment.admin && address?.toLowerCase() !== deployment.admin.toLowerCase() && (
        <div className={styles.warning}>
          <p>⚠️ You are not the admin. Only the admin can use the faucet.</p>
          <p><strong>Admin:</strong> {deployment.admin}</p>
          <p><strong>Your address:</strong> {address}</p>
        </div>
      )}

      <div className={styles.formCard}>
        <h2>Claim Tokens</h2>

        <div className={styles.formGroup}>
          <label htmlFor="recipient">
            Recipient Address
            <button
              onClick={handleQuickFill}
              className={styles.quickFillBtn}
              disabled={!address}
            >
              Use My Address
            </button>
          </label>
          <input
            id="recipient"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="token">Token</label>
          <select
            id="token"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className={styles.select}
          >
            <option value={MATE_TOKEN}>MATE Token (Principal)</option>
            <option value={ETH_TOKEN}>ETH (Wrapped)</option>
          </select>
          <div className={styles.helper}>
            <details>
              <summary>Token Addresses</summary>
              <div>
                <p><strong>MATE:</strong> {MATE_TOKEN}</p>
                <p><strong>ETH:</strong> {ETH_TOKEN}</p>
              </div>
            </details>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            placeholder="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={styles.input}
            step="0.01"
            min="0"
          />
          <div className={styles.quickAmounts}>
            <button onClick={() => setAmount('1000')}>1,000</button>
            <button onClick={() => setAmount('5083')}>5,083 (1 sMATE)</button>
            <button onClick={() => setAmount('10000')}>10,000</button>
            <button onClick={() => setAmount('50000')}>50,000</button>
          </div>
          {amount && parseFloat(amount) > 0 && !isNaN(parseFloat(amount)) && (
            <div className={styles.helper}>
              <small>
                📊 <strong>Will claim:</strong> {parseFloat(amount).toLocaleString()} {tokenAddress === MATE_TOKEN ? 'MATE' : 'ETH'} tokens
                {parseFloat(amount) >= 5083 && tokenAddress === MATE_TOKEN && (
                  <span> ({Math.floor(parseFloat(amount) / 5083)} sMATE{Math.floor(parseFloat(amount) / 5083) > 1 ? 's' : ''})</span>
                )}
              </small>
            </div>
          )}
          <div className={styles.helper}>
            <small>💡 Tip: The 5,083 MATE to stake (1 sMATE) is the minimum requirement for getting rewards as a fisher.</small>
          </div>
        </div>

        <button
          onClick={handleClaimTokens}
          disabled={!isConnected || isExecuting || (deployment.admin && address?.toLowerCase() !== deployment.admin.toLowerCase())}
          className={styles.claimButton}
        >
          {isExecuting ? '⏳ Claiming...' : '🚰 Claim Tokens'}
        </button>

        {error && (
          <div className={styles.error}>
            <p>❌ {error}</p>
          </div>
        )}

        {success && (
          <div className={styles.success}>
            <p>✅ {success}</p>
            {txHash && deployment && (
              <p>
                <a
                  href={getExplorerTxUrl(deployment.chainId, txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer →
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.infoCard}>
        <h3>ℹ️ About the Faucet</h3>
        <ul>
          <li><strong>Admin Only:</strong> Only the admin address can distribute tokens</li>
          <li><strong>MATE Token:</strong> The principal token of your EVVM instance</li>
          <li><strong>Testing:</strong> Use these tokens for development and testing</li>
          <li><strong>Instant:</strong> Tokens are added directly to balances (no mining needed)</li>
        </ul>
      </div>
    </div>
  );
}
