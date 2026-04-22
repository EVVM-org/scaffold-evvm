'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { Badge, EmptyState, Stat, StatGroup } from '@/components/ui';
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
  const { blocks, txs, lastBlock, connected, error } = useLatestBlocks();
  const displayedBlocks = blocks.slice(0, 25);
  const displayedTxs = txs.slice(0, 40);

  const abiMap = useMemo(() => buildAbiMap(deployment), [deployment]);
  const book = useMemo(() => buildAddressBook(deployment), [deployment]);

  return (
    <ExplorerShell
      title="EVVMScan"
      subtitle="Local blockchain explorer for the EVVM virtual layer"
    >
      <div className={styles.card}>
        <StatGroup>
          <Stat
            label="Status"
            value={
              error ? (
                <Badge variant="danger" dot>Disconnected</Badge>
              ) : connected ? (
                <Badge variant="success" dot>Monitoring</Badge>
              ) : (
                <Badge variant="neutral">Connecting…</Badge>
              )
            }
          />
          <Stat
            label="Latest Block"
            value={lastBlock !== null ? `#${lastBlock}` : '—'}
            mono
          />
          <Stat label="Chain ID" value={deployment?.chainId ?? '—'} mono />
          <Stat label="EVVM ID" value={deployment?.evvmID ?? '—'} mono />
        </StatGroup>
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
                {displayedBlocks.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="Waiting for blocks…"
                        description="This will populate as soon as a block is produced on the local chain."
                      />
                    </td>
                  </tr>
                ) : (
                  displayedBlocks.map((b) => (
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
                {displayedTxs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        title="No transactions yet"
                        description="Trigger a faucet claim or any EVVM signature flow to see transactions stream in here."
                      />
                    </td>
                  </tr>
                ) : (
                  displayedTxs.map((tx) => {
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
                          <Badge variant={action.category.startsWith('evvm') ? 'evvm' : 'neutral'} size="sm">
                            {action.methodLabel}
                          </Badge>
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
