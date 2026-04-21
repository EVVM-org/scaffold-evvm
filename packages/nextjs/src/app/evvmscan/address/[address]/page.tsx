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
  classifyAddressDirection,
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
      breadcrumbs={[{ label: 'Addresses' }, { label: shortHash(address, 8, 6) }]}
    >
      <div className={styles.card}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)' }}>
          {known && (
            <span className={`${styles.badge} ${styles.badgePrimary}`}>{known.name}</span>
          )}
          <span className={styles.mono} style={{ fontSize: '0.95rem', fontWeight: 500, wordBreak: 'break-all' }}>
            {address}
          </span>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard.writeText(address).catch(() => {});
            }}
            title="Copy address"
            aria-label="Copy address"
            style={{ fontSize: '1rem' }}
          >
            ⧉
          </button>
        </div>
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
              {mateBalance === null
                ? '—'
                : (() => {
                    const h = formatTokenAmount(mateBalance, 18);
                    const [i, d] = h.split('.');
                    return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
                  })()}
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
                  const dir = classifyAddressDirection(
                    decoded,
                    {
                      from: t.from as `0x${string}`,
                      to: (t.to as `0x${string}` | null) ?? null,
                      value: t.value ?? 0n,
                    },
                    address,
                  );
                  const badgeClass =
                    dir.direction === 'in'
                      ? styles.badgeSuccess
                      : dir.direction === 'out'
                      ? styles.badgeDanger
                      : dir.direction === 'both'
                      ? styles.badgePrimary
                      : styles.badgeNeutral;
                  const badgeLabel =
                    dir.direction === 'in'
                      ? 'IN'
                      : dir.direction === 'out'
                      ? 'OUT'
                      : dir.direction === 'both'
                      ? 'SELF'
                      : dir.direction === 'call'
                      ? 'CALL'
                      : '—';
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
                        <span
                          className={`${styles.badge} ${badgeClass}`}
                          title={dir.note ?? undefined}
                        >
                          {badgeLabel}
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
