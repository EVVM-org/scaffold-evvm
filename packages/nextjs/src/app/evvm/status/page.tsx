'use client';

import { useState, useEffect } from 'react';
import { NetworkBadge } from '@/components/NetworkBadge';
import { NetworkWarning } from '@/components/NetworkWarning';
import { Balances } from '@/components/Balances';
import { EvvmInfo } from '@/components/EvvmInfo';
import { Button, Card, CardHeader, CardBody, Stat, StatGroup, Badge, CodeBlock } from '@/components/ui';
import { getExplorerUrl } from '@/lib/evvmConfig';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { getPublicClient, getCurrentChainId, isContractDeployed } from '@/lib/viemClients';
import { readBalance, readNextNonce as readNonce, readStakedAmount, readIsStaker } from '@/lib/evvmExecutors';
import styles from '@/styles/pages/Status.module.css';

export default function StatusPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [nonce, setNonce] = useState<bigint | null>(null);
  const [stakedAmount, setStakedAmount] = useState<bigint | null>(null);
  const [isStaker, setIsStaker] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [contractMissing, setContractMissing] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

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
    setDataError(null);
    setContractMissing(false);

    try {
      // First check if contracts exist
      const evvmExists = await isContractDeployed(chainId, deployment.evvm);
      if (!evvmExists) {
        setContractMissing(true);
        setDataError('EVVM contract not found. The blockchain may have been reset. Please redeploy using "npm run wizard".');
        setLoading(false);
        return;
      }

      const publicClient = getPublicClient(chainId);

      // Read balance (MATE token - 0x...001)
      const mateToken = '0x0000000000000000000000000000000000000001' as `0x${string}`;
      const bal = await readBalance(publicClient, deployment.evvm, account, mateToken);
      setBalance(bal);

      // Read nonce
      const userNonce = await readNonce(publicClient, deployment.evvm, account);
      setNonce(userNonce);

      // Read staking info (check if staking contract exists first)
      const stakingExists = await isContractDeployed(chainId, deployment.staking);
      if (stakingExists) {
        const staked = await readStakedAmount(publicClient, deployment.staking, account);
        setStakedAmount(staked);

        // Note: isAddressStaker is on the EVVM contract, not the Staking contract
        const stakerStatus = await readIsStaker(publicClient, deployment.evvm, account);
        setIsStaker(stakerStatus);
      }
    } catch (error: any) {
      console.error('Failed to load user data:', error);
      if (error.message?.includes('returned no data') || error.message?.includes('0x')) {
        setContractMissing(true);
        setDataError('Contract not found. The blockchain may have been reset. Please redeploy using "npm run wizard".');
      } else {
        setDataError(error.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>EVVM Status Dashboard</h2>
        </div>
        <p>Loading deployment configuration...</p>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>No EVVM instance configured.</p>
          <p>Please configure an EVVM instance via the <a href="/config">Configuration Page</a>.</p>
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
        <Card elevated>
          <CardHeader
            title="Your account"
            subtitle="Live snapshot of this wallet's EVVM state"
            actions={
              <Button onClick={loadUserData} loading={loading} variant="primary" size="sm">
                {loading ? 'Loading' : 'Load my data'}
              </Button>
            }
          />
          <CardBody>
            {contractMissing && (
              <div className={styles.contractMissing} role="alert">
                <div className={styles.missingContent}>
                  <p className={styles.missingTitle}>EVVM contracts not found</p>
                  <p className={styles.missingText}>
                    No bytecode at the configured address. This usually means the local
                    blockchain (Anvil / Hardhat) was reset. Redeploy from your terminal:
                  </p>
                  <CodeBlock copyable copyValue="npm run wizard">
                    {'npm run wizard'}
                  </CodeBlock>
                </div>
              </div>
            )}

            {dataError && !contractMissing && (
              <div className={styles.error} role="alert">{dataError}</div>
            )}

            {!contractMissing && (balance !== null || nonce !== null) && (
              <StatGroup>
                {balance !== null && <Stat label="MATE balance" value={balance.toString()} mono />}
                {nonce !== null && <Stat label="Next nonce" value={nonce.toString()} mono />}
                {stakedAmount !== null && <Stat label="Staked" value={stakedAmount.toString()} mono />}
                <Stat
                  label="Staker status"
                  value={
                    <Badge variant={isStaker ? 'success' : 'neutral'} dot>
                      {isStaker ? 'Active staker' : 'Not staking'}
                    </Badge>
                  }
                />
              </StatGroup>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
