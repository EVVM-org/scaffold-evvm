'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NetworkBadge } from '@/components/NetworkBadge';
import { LocalNetworkHelper } from '@/components/LocalNetworkHelper';
import { Card, CardHeader, EmptyState, Skeleton, CodeBlock, Button } from '@/components/ui';
import { loadDeployments } from '@/lib/evvmConfig';
import type { EvvmDeployment } from '@/types/evvm';
import styles from '@/styles/Home.module.css';

const ACTIONS: { href: string; label: string; primary?: boolean }[] = [
  { href: '/faucet', label: 'Faucet', primary: true },
  { href: '/evvmscan', label: 'Explorer', primary: true },
  { href: '/evvm/register', label: 'Register EVVM' },
  { href: '/evvm/status', label: 'Status' },
  { href: '/evvm/payments', label: 'Payments' },
  { href: '/evvm/staking', label: 'Staking' },
  { href: '/evvm/nameservice', label: 'Names' },
  { href: '/evvm/p2pswap', label: 'P2P Swap' },
];

export default function Home() {
  const [deployments, setDeployments] = useState<EvvmDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadDeployments();
        if (!cancelled) setDeployments(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load deployments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <span className={styles.heroEyebrow}>Scaffold-EVVM</span>
        <h1 className={styles.heroTitle}>Testing environment for EVVM virtual chains</h1>
        <p className={styles.heroLead}>
          Deploy, sign, and observe EVVM operations on a local chain with a cohesive developer
          toolkit — payments, staking, naming, swaps, and a live block explorer.
        </p>
        <div className={styles.heroActions}>
          <Link href="/evvmscan" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Open Explorer</Button>
          </Link>
          <Link href="/faucet" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Get test tokens</Button>
          </Link>
        </div>
      </section>

      <LocalNetworkHelper />

      <section className={styles.deployments}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Deployed EVVM Instances</h2>
        </div>

        {loading && (
          <Card>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton shape="title" width="40%" />
              <Skeleton shape="text" width="70%" />
              <Skeleton shape="text" width="55%" />
            </div>
          </Card>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <span className={styles.errorTitle}>Could not load deployments</span>
            <span>{error}</span>
            <span className={styles.errorHint}>
              Have you deployed an EVVM instance? Run <code>npm run wizard</code> from the
              project root.
            </span>
          </div>
        )}

        {!loading && !error && deployments.length === 0 && (
          <Card>
            <EmptyState
              title="No EVVM instances yet"
              description="Deploy your first EVVM instance to start testing. Run the wizard from the project root:"
              action={
                <CodeBlock copyable copyValue="npm run wizard">
                  {'npm run wizard'}
                </CodeBlock>
              }
            />
          </Card>
        )}

        {deployments.map((deployment) => (
          <Card key={deployment.chainId} elevated>
            <CardHeader
              title={deployment.evvmName || 'EVVM Instance'}
              actions={
                <NetworkBadge
                  chainId={deployment.chainId}
                  networkName={deployment.networkName}
                />
              }
            />
            <div className={styles.metaGrid}>
              <div className={styles.meta}>
                <span className={styles.metaLabel}>EVVM ID</span>
                <span className={styles.metaValue}>{deployment.evvmID}</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.metaLabel}>Chain ID</span>
                <span className={styles.metaValue}>{deployment.chainId}</span>
              </div>
              <div className={styles.meta} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.metaLabel}>EVVM Address</span>
                <span className={styles.metaValue}>{deployment.evvm}</span>
              </div>
            </div>
            <div className={styles.actionGrid}>
              {ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`${styles.actionLink} ${a.primary ? styles.actionLinkPrimary : ''}`.trim()}
                >
                  {a.label}
                  <span aria-hidden>→</span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick start</h2>
        </div>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h4 className={styles.stepTitle}>Deploy</h4>
              <p className={styles.stepBody}>
                Run <code>npm run wizard</code> and pick Foundry or Hardhat.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h4 className={styles.stepTitle}>Connect wallet</h4>
              <p className={styles.stepBody}>
                Import the local test key or use the wallet button in the top-right.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h4 className={styles.stepTitle}>Sign & observe</h4>
              <p className={styles.stepBody}>
                Use the signature constructors, then watch the tx land in EVVMScan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
