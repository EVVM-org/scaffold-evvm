'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { useLatestBlocks } from '@/hooks/useLatestBlocks';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import {
  buildAbiMap,
  decodeTxInput,
  classifyTx,
  buildAddressBook,
  lookupAddress,
  relativeTime,
  formatGas,
  shortHash,
} from '@/utils/explorer';
import styles from '@/styles/pages/Explorer.module.css';

export default function ExplorerHome() {
  const { deployment } = useEvvmDeployment();
  const { blocks, txs, lastBlock, connected, error } = useLatestBlocks({ keep: 12, txKeep: 20 });

  const abiMap = useMemo(() => buildAbiMap(deployment), [deployment]);
  const book = useMemo(() => buildAddressBook(deployment), [deployment]);

  return (
    <ExplorerShell
      title="EVVMScan"
      subtitle="Local blockchain explorer for the EVVM virtual layer"
    >
      <div className={styles.card}>
        <div style={{ display: 'flex' }}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Status</span>
            <span className={styles.statValue}>
              {error ? (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>Disconnected</span>
              ) : connected ? (
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Monitoring</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeNeutral}`}>Connecting…</span>
              )}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Latest Block</span>
            <span className={styles.statValue}>{lastBlock !== null ? `#${lastBlock}` : '—'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Chain ID</span>
            <span className={styles.statValue}>{deployment?.chainId ?? '—'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>EVVM ID</span>
            <span className={styles.statValue}>{deployment?.evvmID ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Latest Blocks</h3>
            <span className={styles.subtitle}>Most recent first</span>
          </div>
          <div className={`${styles.cardBodyTight} ${styles.tableScroll}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Age</th>
                  <th>Txs</th>
                  <th style={{ textAlign: 'right' }}>Gas Used</th>
                </tr>
              </thead>
              <tbody>
                {blocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      Waiting for blocks…
                    </td>
                  </tr>
                ) : (
                  blocks.map((b) => (
                    <tr key={b.hash ?? b.number?.toString()}>
                      <td>
                        <Link href={`/evvmscan/block/${b.number}`} className={styles.link}>
                          #{b.number?.toString()}
                        </Link>
                      </td>
                      <td>{relativeTime(b.timestamp)}</td>
                      <td>{b.transactions.length}</td>
                      <td style={{ textAlign: 'right' }}>{formatGas(b.gasUsed ?? 0n)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Latest Transactions</h3>
            <span className={styles.subtitle}>Decoded EVVM actions</span>
          </div>
          <div className={`${styles.cardBodyTight} ${styles.tableScroll}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Method</th>
                  <th>Block</th>
                  <th>Age</th>
                  <th>From → To</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      Waiting for transactions…
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => {
                    const decoded = decodeTxInput(tx.to ?? null, tx.input, abiMap);
                    const action = classifyTx(
                      decoded,
                      tx.from as `0x${string}`,
                      (tx.to as `0x${string}` | null) ?? null,
                      lookupAddress(book, tx.to ?? undefined),
                      tx.value ?? 0n,
                      !tx.to,
                    );
                    return (
                      <tr key={tx.hash}>
                        <td>
                          <Link href={`/evvmscan/tx/${tx.hash}`} className={styles.link + ' ' + styles.mono}>
                            {shortHash(tx.hash)}
                          </Link>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${action.category.startsWith('evvm') ? styles.badgeEvvm : styles.badgeNeutral}`}>
                            {action.methodLabel}
                          </span>
                        </td>
                        <td>
                          <Link href={`/evvmscan/block/${tx.blockNumber}`} className={styles.link}>
                            #{tx.blockNumber?.toString()}
                          </Link>
                        </td>
                        <td>{relativeTime(tx.blockTimestamp)}</td>
                        <td>
                          <AddressDisplay address={tx.from} truncate />{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>→</span>{' '}
                          <AddressDisplay address={tx.to} truncate />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ExplorerShell>
  );
}
