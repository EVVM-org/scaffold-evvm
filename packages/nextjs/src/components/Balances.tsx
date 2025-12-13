'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useBalances } from '@/hooks/useBalances';
import { MATE_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS } from '@/utils/constants';
import styles from '@/styles/components/Balances.module.css';

/**
 * Balances Component
 * Displays MATE and ETH token balances for the connected account
 */
export function Balances() {
  const { address, isConnected } = useAccount();
  const { balances, loading, error, refresh } = useBalances();

  // Format address for display
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  // Format balance with proper decimals (18 decimals for both tokens)
  const formatBalance = (balance: bigint | undefined): string => {
    if (balance === undefined) return '...';
    try {
      return parseFloat(formatEther(balance)).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const mateBalance = balances[MATE_TOKEN_ADDRESS];
  const ethBalance = balances[ETH_TOKEN_ADDRESS];

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Balances</h2>
          <p className={styles.notConnected}>Connect your wallet to view balances</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Balances of <span className={styles.address}>{shortAddress}</span>
          </h2>
          <button
            className={styles.refreshButton}
            onClick={refresh}
            disabled={loading}
            title="Refresh balances"
          >
            <svg
              className={`${styles.refreshIcon} ${loading ? styles.spinning : ''}`}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className={styles.balances}>
          <div className={styles.balanceItem}>
            <div className={styles.tokenInfo}>
              <div className={styles.tokenIcon}>
                <span className={styles.tokenSymbol}>M</span>
              </div>
              <span className={styles.tokenName}>MATE Token</span>
            </div>
            <div className={styles.balanceValue}>
              {loading ? (
                <div className={styles.skeleton}></div>
              ) : (
                <>
                  <span className={styles.amount}>{formatBalance(mateBalance)}</span>
                  <span className={styles.unit}>MATE</span>
                </>
              )}
            </div>
          </div>

          <div className={styles.balanceItem}>
            <div className={styles.tokenInfo}>
              <div className={styles.tokenIcon}>
                <span className={styles.tokenSymbol}>E</span>
              </div>
              <span className={styles.tokenName}>ETH Token</span>
            </div>
            <div className={styles.balanceValue}>
              {loading ? (
                <div className={styles.skeleton}></div>
              ) : (
                <>
                  <span className={styles.amount}>{formatBalance(ethBalance)}</span>
                  <span className={styles.unit}>ETH</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
