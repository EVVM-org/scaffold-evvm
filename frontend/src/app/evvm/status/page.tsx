'use client';

import { useState, useEffect } from 'react';
import { NetworkBadge } from '@/components/NetworkBadge';
import { NetworkWarning } from '@/components/NetworkWarning';
import { Balances } from '@/components/Balances';
import { EvvmInfo } from '@/components/EvvmInfo';
import { loadDeployments, getExplorerUrl } from '@/lib/evvmConfig';
import type { EvvmDeployment } from '@/types/evvm';
import { getPublicClient, getCurrentChainId } from '@/lib/viemClients';
import { readBalance, readNextNonce as readNonce, readStakedAmount, readIsStaker } from '@/lib/evvmExecutors';
import styles from '@/styles/pages/Status.module.css';

export default function StatusPage() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [nonce, setNonce] = useState<bigint | null>(null);
  const [stakedAmount, setStakedAmount] = useState<bigint | null>(null);
  const [isStaker, setIsStaker] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeploymentData();
    checkWalletConnection();
  }, []);

  async function loadDeploymentData() {
    try {
      const deployments = await loadDeployments();
      if (deployments.length > 0) {
        setDeployment(deployments[0]);
      }
    } catch (error) {
      console.error('Failed to load deployment:', error);
    }
  }

  async function checkWalletConnection() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await (window.ethereum.request as any)({ method: 'eth_accounts' });
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

  async function loadUserData() {
    if (!deployment || !account || !chainId) return;

    setLoading(true);
    try {
      const publicClient = getPublicClient(chainId);

      // Read balance (MATE token - 0x...001)
      const mateToken = '0x0000000000000000000000000000000000000001' as `0x${string}`;
      const bal = await readBalance(publicClient, deployment.evvm, account, mateToken);
      setBalance(bal);

      // Read nonce
      const userNonce = await readNonce(publicClient, deployment.evvm, account);
      setNonce(userNonce);

      // Read staking info
      const staked = await readStakedAmount(publicClient, deployment.staking, account);
      setStakedAmount(staked);

      const stakerStatus = await readIsStaker(publicClient, deployment.staking, account);
      setIsStaker(stakerStatus);
    } catch (error: any) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>No EVVM deployment found.</p>
          <p>Please run the deployment wizard first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>EVVM Status Dashboard</h2>
      </div>

      <NetworkWarning deployment={deployment} />

      {/* EVVM Info Component - Shows all contract addresses */}
      <EvvmInfo />

      {/* Balances Component - Shows token balances */}
      {account && <Balances />}

      {account && (
        <section className={styles.userInfo}>
          <h3>Your Account Information</h3>
          <button onClick={loadUserData} disabled={loading} className={styles.loadButton}>
            {loading ? 'Loading...' : 'Load My Data'}
          </button>

          {(balance !== null || nonce !== null) && (
            <div className={styles.infoGrid}>
              {balance !== null && (
                <div className={styles.infoItem}>
                  <span className={styles.label}>MATE Balance:</span>
                  <span className={styles.value}>{balance.toString()}</span>
                </div>
              )}
              {nonce !== null && (
                <div className={styles.infoItem}>
                  <span className={styles.label}>Next Nonce:</span>
                  <span className={styles.value}>{nonce.toString()}</span>
                </div>
              )}
              {stakedAmount !== null && (
                <div className={styles.infoItem}>
                  <span className={styles.label}>Staked Amount:</span>
                  <span className={styles.value}>{stakedAmount.toString()}</span>
                </div>
              )}
              <div className={styles.infoItem}>
                <span className={styles.label}>Staker Status:</span>
                <span className={styles.value}>{isStaker ? '✓ Staker' : '✗ Not Staker'}</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
