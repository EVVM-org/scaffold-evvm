'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkBadge } from '@/components/NetworkBadge';
import { loadDeployments, getExplorerUrl, type EvvmDeployment } from '@/lib/evvmConfig';
import { getPublicClient, getCurrentChainId } from '@/lib/viemClients';
import { readBalance, readNextNonce, readStakedAmount, readIsStaker } from '@/lib/evvmExecutors';
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
        <WalletConnect />
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
        <h2>EVVM Status</h2>
        <WalletConnect />
      </div>

      <section className={styles.deploymentInfo}>
        <h3>Deployment Information</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>EVVM Name:</span>
            <span className={styles.value}>{deployment.evvmName || 'N/A'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>EVVM ID:</span>
            <span className={styles.value}>{deployment.evvmID}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Network:</span>
            <NetworkBadge chainId={deployment.chainId} networkName={deployment.networkName} />
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>EVVM Address:</span>
            <a
              href={getExplorerUrl(deployment.chainId, deployment.evvm)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {deployment.evvm}
            </a>
          </div>
        </div>
      </section>

      <section className={styles.contractAddresses}>
        <h3>Contract Addresses</h3>
        <div className={styles.addressList}>
          {[
            { name: 'Name Service', address: deployment.nameService },
            { name: 'Staking', address: deployment.staking },
            { name: 'Estimator', address: deployment.estimator },
            { name: 'Treasury', address: deployment.treasury },
            { name: 'P2P Swap', address: deployment.p2pSwap },
          ].map(({ name, address }) => (
            address && (
              <div key={name} className={styles.addressItem}>
                <span className={styles.contractName}>{name}:</span>
                <a
                  href={getExplorerUrl(deployment.chainId, address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {address}
                </a>
              </div>
            )
          ))}
        </div>
      </section>

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
