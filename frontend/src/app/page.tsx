'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkBadge } from '@/components/NetworkBadge';
import { loadDeployments, type EvvmDeployment } from '@/lib/evvmConfig';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const [deployments, setDeployments] = useState<EvvmDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeployments() {
      try {
        const data = await loadDeployments();
        setDeployments(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDeployments();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <WalletConnect />
      </div>

      <section className={styles.hero}>
        <h2>Welcome to Scaffold-EVVM</h2>
        <p>
          A comprehensive testing and debugging framework for EVVM virtual blockchains.
          Deploy, test, and interact with your EVVM instances seamlessly.
        </p>
      </section>

      <section className={styles.deployments}>
        <h3>🚀 Deployed EVVM Instances</h3>

        {loading && <p className={styles.loading}>Loading deployments...</p>}

        {error && (
          <div className={styles.error}>
            <p>⚠️ {error}</p>
            <p className={styles.errorHint}>
              Have you deployed an EVVM instance? Run <code>npm run wizard</code> in the contracts directory.
            </p>
          </div>
        )}

        {!loading && !error && deployments.length === 0 && (
          <div className={styles.empty}>
            <p>No EVVM instances found.</p>
            <p className={styles.hint}>
              Deploy your first EVVM instance:
            </p>
            <pre className={styles.code}>
              cd contracts{'\n'}
              npm run wizard
            </pre>
          </div>
        )}

        {deployments.map((deployment) => (
          <div key={deployment.chainId} className={styles.deploymentCard}>
            <div className={styles.cardHeader}>
              <h4>{deployment.evvmName || 'EVVM Instance'}</h4>
              <NetworkBadge chainId={deployment.chainId} networkName={deployment.networkName} />
            </div>

            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.label}>EVVM ID:</span>
                <span className={styles.value}>{deployment.evvmID}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>EVVM Address:</span>
                <span className={styles.value}>{deployment.evvm}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Chain ID:</span>
                <span className={styles.value}>{deployment.chainId}</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <Link href="/faucet" className={`${styles.actionButton} ${styles.featuredAction}`}>
                🚰 Faucet
              </Link>
              <Link href="/evvm/register" className={styles.actionButton}>
                Register EVVM
              </Link>
              <Link href="/evvm/status" className={styles.actionButton}>
                Status
              </Link>
              <Link href="/evvm/payments" className={styles.actionButton}>
                Payments
              </Link>
              <Link href="/evvm/staking" className={styles.actionButton}>
                Staking
              </Link>
              <Link href="/evvm/nameservice" className={styles.actionButton}>
                Names
              </Link>
              <Link href="/evvm/p2pswap" className={styles.actionButton}>
                P2P Swap
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.quickStart}>
        <h3>📚 Quick Start</h3>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h4>Deploy EVVM</h4>
              <p>Run <code>npm run wizard</code> to deploy your EVVM instance</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h4>Connect Wallet</h4>
              <p>Connect your wallet to interact with EVVM</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h4>Test & Debug</h4>
              <p>Use the testing tools to interact with your EVVM</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
