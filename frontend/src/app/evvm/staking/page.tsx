'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { DebugConsole } from '@/components/DebugConsole';
import { loadDeployments, getExplorerTxUrl, type EvvmDeployment } from '@/lib/evvmConfig';
import { getWalletClient, getPublicClient, getCurrentChainId } from '@/lib/viemClients';
import { buildAndSignStaking } from '@/lib/evvmSignatures';
import { executeStaking, readStakedAmount, readIsStaker } from '@/lib/evvmExecutors';
import type { DebugEntry } from '@/types/evvm';
import styles from '@/styles/pages/Staking.module.css';

export default function StakingPage() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);

  const [amount, setAmount] = useState('');
  const [nonce, setNonce] = useState('');
  const [stakedAmount, setStakedAmount] = useState<bigint | null>(null);
  const [isStaker, setIsStaker] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeploymentData();
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (account && deployment && chainId) {
      loadStakingInfo();
    }
  }, [account, deployment, chainId]);

  async function loadDeploymentData() {
    try {
      const deployments = await loadDeployments();
      if (deployments.length > 0) {
        setDeployment(deployments[0]);
      }
    } catch (error) {
      addDebugEntry('error', 'Failed to load deployment', error);
    }
  }

  async function checkWalletConnection() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const currentChainId = await getCurrentChainId();
          setChainId(currentChainId);
        }
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    }
  }

  async function loadStakingInfo() {
    if (!deployment || !account || !chainId) return;

    try {
      const publicClient = getPublicClient(chainId);
      const staked = await readStakedAmount(publicClient, deployment.staking, account);
      setStakedAmount(staked);

      const stakerStatus = await readIsStaker(publicClient, deployment.staking, account);
      setIsStaker(stakerStatus);

      addDebugEntry('info', 'Staking Info Loaded', { staked: staked.toString(), isStaker: stakerStatus });
    } catch (error: any) {
      addDebugEntry('error', 'Failed to load staking info', error.message);
    }
  }

  function addDebugEntry(type: DebugEntry['type'], label: string, payload: any) {
    setDebugEntries((prev) => [
      ...prev,
      { type, label, payload, timestamp: Date.now() },
    ]);
  }

  async function handleStake() {
    if (!deployment || !account || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Please connect wallet and ensure deployment exists');
      return;
    }

    setLoading(true);
    try {
      const walletClient = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const params = {
        evvmID: BigInt(deployment.evvmID),
        amount: BigInt(amount),
        nonce: BigInt(nonce),
      };

      addDebugEntry('info', 'Building staking message', params);

      const { message, signature } = await buildAndSignStaking(walletClient, account, params);

      addDebugEntry('request', 'Message Built', message);
      addDebugEntry('response', 'Signature Generated', signature);

      // Execute staking
      const stakingData = {
        from: account,
        amount: BigInt(amount),
        nonce: BigInt(nonce),
        signature,
      };

      addDebugEntry('info', 'Executing staking transaction', stakingData);

      const txHash = await executeStaking(walletClient, publicClient, deployment.staking, stakingData);

      addDebugEntry('response', 'Transaction Submitted', {
        hash: txHash,
        explorer: getExplorerTxUrl(chainId, txHash),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      addDebugEntry('response', 'Transaction Confirmed', receipt);

      // Reload staking info
      await loadStakingInfo();
    } catch (error: any) {
      addDebugEntry('error', 'Staking Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!deployment) {
    return (
      <div className={styles.container}>
        <WalletConnect />
        <div className={styles.error}>No EVVM deployment found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>EVVM Staking</h2>
        <WalletConnect />
      </div>

      <section className={styles.stakingInfo}>
        <h3>Your Staking Status</h3>
        {account ? (
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Staked Amount:</span>
              <span className={styles.value}>
                {stakedAmount !== null ? stakedAmount.toString() : 'Loading...'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Staker Status:</span>
              <span className={styles.value}>
                {isStaker ? '✓ Active Staker' : '✗ Not Staking'}
              </span>
            </div>
          </div>
        ) : (
          <p className={styles.connectPrompt}>Connect your wallet to view staking info</p>
        )}
      </section>

      <section className={styles.stakingForm}>
        <h3>Stake MATE Tokens</h3>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>Amount to Stake:</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000000000000000"
            />
            <small>Amount in wei (1 MATE = 10^18 wei)</small>
          </div>

          <div className={styles.formGroup}>
            <label>Nonce:</label>
            <input
              type="text"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              placeholder="0"
            />
            <small>Sequential nonce for your account</small>
          </div>

          <button
            onClick={handleStake}
            disabled={loading || !account}
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Build, Sign & Stake'}
          </button>
        </div>
      </section>

      <section className={styles.info}>
        <h3>About Staking</h3>
        <div className={styles.infoText}>
          <p>
            Staking MATE tokens makes you eligible for rewards when you act as a fisher,
            capturing and validating transactions on the EVVM network.
          </p>
          <ul>
            <li>Stakers receive base MATE token rewards (1x per transaction)</li>
            <li>Priority fees go directly to stakers</li>
            <li>Enhanced reward multipliers for stakers</li>
            <li>Staker status is verified via the Staking contract</li>
          </ul>
        </div>
      </section>

      <DebugConsole entries={debugEntries} onClear={() => setDebugEntries([])} />
    </div>
  );
}
