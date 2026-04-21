'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEther } from 'viem';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { useExplorerClient } from '@/hooks/useExplorerClient';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { useLatestBlocks } from '@/hooks/useLatestBlocks';
import {
  buildAbiMap,
  buildAddressBook,
  classifyTx,
  decodeTxInput,
  lookupAddress,
  formatEth,
  formatTokenAmount,
  relativeTime,
  shortHash,
  MATE_TOKEN,
} from '@/utils/explorer';
import { CoreABI, StakingABI } from '@evvm/evvm-js';
import styles from '@/styles/pages/Explorer.module.css';

export default function AddressDetailPage() {
  const params = useParams<{ address: string }>();
  const address = params.address as `0x${string}`;
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();
  const { txs: liveTxs } = useLatestBlocks({ txKeep: 100 });

  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [mateBalance, setMateBalance] = useState<bigint | null>(null);
  const [stakedAmount, setStakedAmount] = useState<bigint | null>(null);
  const [isContract, setIsContract] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bytecode = await client.getBytecode({ address }).catch(() => null);
        if (!cancelled) setIsContract(!!bytecode && bytecode !== '0x');

        const eth = await client.getBalance({ address }).catch(() => null);
        if (!cancelled) setEthBalance(eth);

        if (deployment?.evvm) {
          const mate = await client
            .readContract({
              address: deployment.evvm,
              abi: CoreABI,
              functionName: 'getBalance',
              args: [address, MATE_TOKEN],
            })
            .catch(() => null);
          if (!cancelled) setMateBalance((mate as bigint) ?? null);
        }

        if (deployment?.staking) {
          const staked = await client
            .readContract({
              address: deployment.staking,
              abi: StakingABI,
              functionName: 'getUserAmountStaked',
              args: [address],
            })
            .catch(() => null);
          if (!cancelled) setStakedAmount((staked as bigint) ?? null);
        }
      } catch {
        // swallow — fields stay null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, client, deployment]);

  const abiMap = useMemo(() => buildAbiMap(deployment), [deployment]);
  const book = useMemo(() => buildAddressBook(deployment), [deployment]);
  const known = useMemo(() => lookupAddress(book, address), [book, address]);

  const relevantTxs = useMemo(() => {
    const lower = address.toLowerCase();
    return liveTxs.filter(
      (t) => t.from.toLowerCase() === lower || t.to?.toLowerCase() === lower,
    );
  }, [liveTxs, address]);

  return (
    <ExplorerShell
      title={known ? known.name : 'Address'}
      subtitle={address}
      breadcrumbs={[{ label: 'Addresses' }, { label: shortHash(address, 8, 6) }]}
    >
      <div className={styles.card}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Type</span>
            <span className={styles.statValue}>
              {isContract === null ? (
                <span className={`${styles.badge} ${styles.badgeNeutral}`}>…</span>
              ) : isContract ? (
                <span className={`${styles.badge} ${styles.badgePrimary}`}>Contract</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeNeutral}`}>EOA</span>
              )}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>ETH Balance</span>
            <span className={styles.statValue}>
              {ethBalance === null ? '—' : `${formatEth(ethBalance)} ETH`}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>MATE (EVVM)</span>
            <span className={styles.statValue}>
              {mateBalance === null ? '—' : formatTokenAmount(mateBalance, 18)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Staked</span>
            <span className={styles.statValue}>
              {stakedAmount === null ? '—' : stakedAmount.toString()}
            </span>
          </div>
        </div>
      </div>

      {known && (
        <div className={styles.card}>
          <div className={styles.cardBodyTight}>
            <div className={styles.row}>
              <span className={styles.label}>Name</span>
              <span className={styles.value}>
                <span className={`${styles.badge} ${styles.badgePrimary}`}>{known.name}</span>{' '}
                <span className={styles.valueText}>
                  {known.kind} · Part of the scaffold-evvm deployment
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recent Transactions</h3>
          <span className={styles.subtitle}>
            From the live polling window · {relevantTxs.length} match{relevantTxs.length === 1 ? '' : 'es'}
          </span>
        </div>
        <div className={`${styles.cardBodyTight} ${styles.tableScroll}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hash</th>
                <th>Method</th>
                <th>Block</th>
                <th>Age</th>
                <th>Direction</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {relevantTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No recent transactions for this address. Older transactions require a historical
                    indexer, which the local explorer doesn&apos;t maintain.
                  </td>
                </tr>
              ) : (
                relevantTxs.map((t) => {
                  const decoded = decodeTxInput(t.to ?? null, t.input, abiMap);
                  const action = classifyTx(
                    decoded,
                    t.from as `0x${string}`,
                    (t.to as `0x${string}` | null) ?? null,
                    lookupAddress(book, t.to ?? undefined),
                    t.value ?? 0n,
                    !t.to,
                  );
                  const isOutgoing = t.from.toLowerCase() === address.toLowerCase();
                  return (
                    <tr key={t.hash}>
                      <td>
                        <Link href={`/evvmscan/tx/${t.hash}`} className={`${styles.link} ${styles.mono}`}>
                          {shortHash(t.hash)}
                        </Link>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${action.category.startsWith('evvm') ? styles.badgeEvvm : styles.badgeNeutral}`}>
                          {action.methodLabel}
                        </span>
                      </td>
                      <td>
                        <Link href={`/evvmscan/block/${t.blockNumber}`} className={styles.link}>
                          #{t.blockNumber?.toString()}
                        </Link>
                      </td>
                      <td>{relativeTime(t.blockTimestamp)}</td>
                      <td>
                        <span className={`${styles.badge} ${isOutgoing ? styles.badgeDanger : styles.badgeSuccess}`}>
                          {isOutgoing ? 'OUT' : 'IN'}
                        </span>
                      </td>
                      <td>{formatEther(t.value ?? 0n)} ETH</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ExplorerShell>
  );
}
