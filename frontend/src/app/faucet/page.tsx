'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { EvvmABI } from '@evvm/viem-signature-library';
import { WalletConnect } from '@/components/WalletConnect';
import styles from '@/styles/pages/Faucet.module.css';

// Common token addresses in EVVM
const MATE_TOKEN = '0x0000000000000000000000000000000000000001';
const ETH_TOKEN = '0x0000000000000000000000000000000000000000';

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
      setError('Please enter a valid amount');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Convert amount to BigInt (assuming 18 decimals)
      const amountInWei = BigInt(parseFloat(amount) * 10 ** 18);

      // Call addBalance function on EVVM contract
      const hash = await writeContract(config, {
        abi: EvvmABI,
        address: deployment.evvm as `0x${string}`,
        functionName: 'addBalance',
        args: [recipient as `0x${string}`, tokenAddress as `0x${string}`, amountInWei],
      });

      setTxHash(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(config, { hash });

      setSuccess(`Successfully sent ${amount} tokens to ${recipient}`);
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
        <WalletConnect />
      </div>

      <div className={styles.deploymentInfo}>
        <h3>Deployment Info</h3>
        <div className={styles.infoGrid}>
          <div><strong>Network:</strong> {deployment.networkName}</div>
          <div><strong>EVVM:</strong> {deployment.evvmName}</div>
          <div><strong>EVVM ID:</strong> {deployment.evvmID}</div>
          <div><strong>Admin:</strong> {deployment.admin}</div>
        </div>
      </div>

      {!isConnected && (
        <div className={styles.warning}>
          <p>⚠️ Please connect your wallet to use the faucet</p>
        </div>
      )}

      {isConnected && address !== deployment.admin && (
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
          />
          <div className={styles.quickAmounts}>
            <button onClick={() => setAmount('100')}>100</button>
            <button onClick={() => setAmount('1000')}>1,000</button>
            <button onClick={() => setAmount('10000')}>10,000</button>
            <button onClick={() => setAmount('100000')}>100,000</button>
          </div>
        </div>

        <button
          onClick={handleClaimTokens}
          disabled={!isConnected || isExecuting || address !== deployment.admin}
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
            {txHash && (
              <p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
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
