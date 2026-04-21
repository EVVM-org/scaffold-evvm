'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Block, Transaction } from 'viem';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { useExplorerClient } from '@/hooks/useExplorerClient';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import {
  buildAbiMap,
  buildAddressBook,
  classifyTx,
  decodeTxInput,
  lookupAddress,
  formatEth,
  formatGas,
  formatUtcDate,
  relativeTime,
  shortHash,
} from '@/utils/explorer';
import styles from '@/styles/pages/Explorer.module.css';

export default function BlockDetailPage() {
  const params = useParams<{ number: string }>();
  const num = params.number;
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();

  const [block, setBlock] = useState<Block | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const b = await client.getBlock({
          blockNumber: BigInt(num),
          includeTransactions: true,
        });
        if (!cancelled) setBlock(b);
      } catch (err: any) {
        if (!cancelled) setError(err?.shortMessage ?? err?.message ?? 'Failed to load block');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, num]);

  const abiMap = useMemo(() => buildAbiMap(deployment), [deployment]);
  const book = useMemo(() => buildAddressBook(deployment), [deployment]);

  return (
    <ExplorerShell
      title={`Block #${num}`}
      subtitle={block ? `${block.transactions.length} transactions` : undefined}
      breadcrumbs={[{ label: 'Blocks' }, { label: `#${num}` }]}
    >
      {loading && (
        <div className={styles.card}>
          <div className={styles.empty}>Loading block…</div>
        </div>
      )}
      {error && (
        <div className={styles.card}>
          <div className={styles.empty}>
            <span className={`${styles.badge} ${styles.badgeDanger}`}>Error</span> {error}
          </div>
        </div>
      )}

      {!loading && !error && block && (
        <>
          <div className={styles.card}>
            <div className={styles.cardBodyTight}>
              <Row label="Block Height">
                #{block.number?.toString()}{' '}
                <span style={{ marginLeft: 8 }}>
                  <Link
                    href={`/evvmscan/block/${(block.number ?? 0n) - 1n}`}
                    className={styles.link}
                  >
                    ‹ prev
                  </Link>{' '}
                  <Link
                    href={`/evvmscan/block/${(block.number ?? 0n) + 1n}`}
                    className={styles.link}
                  >
                    next ›
                  </Link>
                </span>
              </Row>
              <Row label="Timestamp">
                {relativeTime(block.timestamp)} · {formatUtcDate(block.timestamp)}
              </Row>
              <Row label="Transactions">{block.transactions.length}</Row>
              <Row label="Hash">
                <span className={styles.mono}>{block.hash}</span>
              </Row>
              <Row label="Parent Hash">
                <span className={styles.mono}>{block.parentHash}</span>
              </Row>
              <Row label="Gas Used / Limit">
                {formatGas(block.gasUsed ?? 0n)} / {formatGas(block.gasLimit ?? 0n)}
              </Row>
              <Row label="Base Fee">
                {block.baseFeePerGas ? `${formatEth(block.baseFeePerGas)} ETH` : '—'}
              </Row>
              <Row label="Miner">
                <AddressDisplay address={block.miner} />
              </Row>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Transactions in this block</h3>
            </div>
            <div className={`${styles.cardBodyTight} ${styles.tableScroll}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hash</th>
                    <th>Method</th>
                    <th>From → To</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {block.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Empty block
                      </td>
                    </tr>
                  ) : (
                    block.transactions.map((tx, i) => {
                      if (typeof tx !== 'object') return null;
                      const t = tx as Transaction;
                      const decoded = decodeTxInput(t.to ?? null, t.input, abiMap);
                      const action = classifyTx(
                        decoded,
                        t.from as `0x${string}`,
                        (t.to as `0x${string}` | null) ?? null,
                        lookupAddress(book, t.to ?? undefined),
                        t.value ?? 0n,
                        !t.to,
                      );
                      return (
                        <tr key={t.hash}>
                          <td>{i}</td>
                          <td>
                            <Link
                              href={`/evvmscan/tx/${t.hash}`}
                              className={`${styles.link} ${styles.mono}`}
                            >
                              {shortHash(t.hash)}
                            </Link>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${action.category.startsWith('evvm') ? styles.badgeEvvm : styles.badgeNeutral}`}>
                              {action.methodLabel}
                            </span>
                          </td>
                          <td>
                            <AddressDisplay address={t.from} truncate />{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>→</span>{' '}
                            <AddressDisplay address={t.to} truncate />
                          </td>
                          <td>{formatEth(t.value ?? 0n)} ETH</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </ExplorerShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}
