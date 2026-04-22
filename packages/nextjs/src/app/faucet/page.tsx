'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { CoreABI } from '@evvm/evvm-js';
import { getExplorerTxUrl } from '@/lib/evvmConfig';
import { parseTokenAmount } from '@/utils/parseTokenAmount';
import { Button, Input, Select, Badge } from '@/components/ui';
import styles from '@/styles/pages/Faucet.module.css';

// Common token addresses in EVVM
const MATE_TOKEN = '0x0000000000000000000000000000000000000001';
const ETH_TOKEN = '0x0000000000000000000000000000000000000000';

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
        abi: CoreABI,
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
        <div className={styles.error} role="alert">
          <Badge variant="danger">No deployment</Badge>
          <p>Deploy an EVVM instance first using: <code>npm run wizard</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>MATE Token Faucet</h1>
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
        <div className={styles.warning} role="alert">
          <Badge variant="warning">Wallet</Badge>
          <p>Connect your wallet to use the faucet.</p>
        </div>
      )}

      {isConnected && deployment.admin && address?.toLowerCase() !== deployment.admin.toLowerCase() && (
        <div className={styles.warning} role="alert">
          <Badge variant="warning">Permissions</Badge>
          <p>You are not the admin. Only the admin can use the faucet.</p>
          <p><strong>Admin:</strong> {deployment.admin}</p>
          <p><strong>Your address:</strong> {address}</p>
        </div>
      )}

      <div className={styles.formCard}>
        <h2>Claim tokens</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            id="recipient"
            label="Recipient address"
            placeholder="0x…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            mono
            spellCheck={false}
            autoComplete="off"
            trailing={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickFill}
                disabled={!address}
                type="button"
              >
                My address
              </Button>
            }
          />

          <Select
            id="token"
            label="Token"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            options={[
              { value: MATE_TOKEN, label: 'MATE Token (Principal)' },
              { value: ETH_TOKEN, label: 'ETH (Wrapped)' },
            ]}
          />

          <Input
            id="amount"
            type="number"
            label="Amount"
            placeholder="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min={0}
            mono
            helper={
              <>
                {amount && parseFloat(amount) > 0 && !isNaN(parseFloat(amount)) && (
                  <span>
                    Will claim {parseFloat(amount).toLocaleString()}{' '}
                    {tokenAddress === MATE_TOKEN ? 'MATE' : 'ETH'}
                    {parseFloat(amount) >= 5083 && tokenAddress === MATE_TOKEN && (
                      <>
                        {' '}·{' '}
                        {Math.floor(parseFloat(amount) / 5083)} sMATE
                        {Math.floor(parseFloat(amount) / 5083) > 1 ? 's' : ''}
                      </>
                    )}
                    . Tip: 5,083 MATE is 1 sMATE, the minimum to earn fisher rewards.
                  </span>
                )}
              </>
            }
          />

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => setAmount('1000')}>1,000</Button>
            <Button variant="secondary" size="sm" onClick={() => setAmount('5083')}>5,083 (1 sMATE)</Button>
            <Button variant="secondary" size="sm" onClick={() => setAmount('10000')}>10,000</Button>
            <Button variant="secondary" size="sm" onClick={() => setAmount('50000')}>50,000</Button>
          </div>

          <div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleClaimTokens}
              loading={isExecuting}
              disabled={!isConnected || isExecuting || (deployment.admin && address?.toLowerCase() !== deployment.admin.toLowerCase())}
            >
              {isExecuting ? 'Claiming…' : 'Claim tokens'}
            </Button>
          </div>
        </div>

        {error && (
          <div className={styles.error} role="alert">{error}</div>
        )}

        {success && (
          <div className={styles.success} role="status">
            <Badge variant="success" dot>Success</Badge>
            <span>{success}</span>
          </div>
        )}
      </div>

      <div className={styles.infoCard}>
        <h3>About the faucet</h3>
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
