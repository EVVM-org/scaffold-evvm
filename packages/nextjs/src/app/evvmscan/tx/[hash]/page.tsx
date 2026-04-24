'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type {
  Block,
  Transaction,
  TransactionReceipt,
  Hex,
} from 'viem';
import { ExplorerShell } from '@/components/explorer/ExplorerShell';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { ParamValue } from '@/components/explorer/ParamValue';
import { useExplorerClient } from '@/hooks/useExplorerClient';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { useCustomServices } from '@/hooks/useCustomServices';
import {
  buildAbiMap,
  buildAddressBook,
  classifyTx,
  decodeLog,
  decodeTxInput,
  inferTransfers,
  lookupAddress,
  resolveToken,
  formatEth,
  formatGas,
  formatGasPrice,
  formatTokenAmount,
  formatUtcDate,
  gasUsagePercent,
  relativeTime,
  shortHash,
  ZERO_ADDRESS,
  MATE_TOKEN,
} from '@/utils/explorer';
import styles from '@/styles/pages/Explorer.module.css';

type Tab = 'overview' | 'logs' | 'input';

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(renderValue).join(', ') + ']';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(
        value,
        (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
        2,
      );
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isAddressLike(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

export default function TxDetailPage() {
  const params = useParams<{ hash: string }>();
  const hash = params.hash as Hex;
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();
  const { registry: servicesRegistry } = useCustomServices();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const t = await client.getTransaction({ hash });
        if (cancelled) return;
        setTx(t);
        const [r, b] = await Promise.all([
          client.getTransactionReceipt({ hash }).catch(() => null),
          t.blockNumber
            ? client.getBlock({ blockNumber: t.blockNumber }).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setReceipt(r);
        setBlock(b);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.shortMessage ?? err?.message ?? 'Failed to load transaction');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, hash]);

  const abiMap = useMemo(
    () => buildAbiMap(deployment, servicesRegistry),
    [deployment, servicesRegistry],
  );
  const book = useMemo(() => buildAddressBook(deployment), [deployment]);

  const decoded = useMemo(
    () => (tx ? decodeTxInput(tx.to ?? null, tx.input, abiMap) : null),
    [tx, abiMap],
  );

  const action = useMemo(() => {
    if (!tx) return null;
    return classifyTx(
      decoded,
      tx.from as `0x${string}`,
      (tx.to as `0x${string}` | null) ?? null,
      lookupAddress(book, tx.to ?? undefined),
      tx.value ?? 0n,
      !tx.to,
    );
  }, [tx, decoded, book]);

  const transfers = useMemo(() => {
    if (!tx) return [];
    return inferTransfers(decoded, tx.from as `0x${string}`, (tx.to as `0x${string}` | null) ?? null);
  }, [tx, decoded]);

  const decodedLogs = useMemo(
    () => (receipt ? receipt.logs.map((l) => decodeLog(l, abiMap)) : []),
    [receipt, abiMap],
  );

  const status: 'success' | 'reverted' | 'pending' = receipt
    ? receipt.status === 'success'
      ? 'success'
      : 'reverted'
    : 'pending';

  return (
    <ExplorerShell
      title="Transaction Details"
      subtitle={action?.summary}
      breadcrumbs={[{ label: 'Transactions' }, { label: shortHash(hash) }]}
    >
      {loading && (
        <div className={styles.card}>
          <div className={styles.empty}>Loading transaction…</div>
        </div>
      )}
      {error && (
        <div className={styles.card}>
          <div className={styles.empty}>
            <span className={`${styles.badge} ${styles.badgeDanger}`}>Error</span> {error}
          </div>
        </div>
      )}

      {!loading && !error && tx && (
        <>
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${tab === 'overview' ? styles.tabActive : ''}`}
              onClick={() => setTab('overview')}
            >
              Overview
            </button>
            <button
              className={`${styles.tab} ${tab === 'logs' ? styles.tabActive : ''}`}
              onClick={() => setTab('logs')}
            >
              Logs ({receipt?.logs.length ?? 0})
            </button>
            <button
              className={`${styles.tab} ${tab === 'input' ? styles.tabActive : ''}`}
              onClick={() => setTab('input')}
            >
              Input Data
            </button>
          </div>

          {tab === 'overview' && (
            <>
              {action && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Transaction Action</h3>
                    <span className={`${styles.badge} ${action.category.startsWith('evvm') ? styles.badgeEvvm : styles.badgePrimary}`}>
                      {action.methodLabel}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.valueText}>{action.summary}</span>
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <div className={styles.cardBodyTight}>
                  <OverviewRow label="Transaction Hash">
                    <span className={styles.mono}>{hash}</span>
                  </OverviewRow>
                  <OverviewRow label="Status">
                    {status === 'success' && (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>✓ Success</span>
                    )}
                    {status === 'reverted' && (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>✕ Reverted</span>
                    )}
                    {status === 'pending' && (
                      <span className={`${styles.badge} ${styles.badgeNeutral}`}>Pending</span>
                    )}
                  </OverviewRow>
                  <OverviewRow label="Block">
                    {tx.blockNumber !== null && tx.blockNumber !== undefined ? (
                      <Link href={`/evvmscan/block/${tx.blockNumber}`} className={styles.link}>
                        #{tx.blockNumber.toString()}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </OverviewRow>
                  {block && (
                    <OverviewRow label="Timestamp">
                      <span className={styles.valueText}>
                        {relativeTime(block.timestamp)} · {formatUtcDate(block.timestamp)}
                      </span>
                    </OverviewRow>
                  )}
                  <OverviewRow label="From">
                    <AddressDisplay address={tx.from} />
                  </OverviewRow>
                  <OverviewRow label="To">
                    {tx.to ? (
                      <AddressDisplay address={tx.to} />
                    ) : (
                      <span>
                        <span className={`${styles.badge} ${styles.badgePrimary}`}>Contract Creation</span>
                        {receipt?.contractAddress && (
                          <>
                            {' '}
                            <AddressDisplay address={receipt.contractAddress} />
                          </>
                        )}
                      </span>
                    )}
                  </OverviewRow>
                  <OverviewRow label="Value">
                    <span className={styles.valueText}>{formatEth(tx.value ?? 0n)} ETH</span>
                  </OverviewRow>
                  {receipt && (
                    <OverviewRow label="Transaction Fee">
                      <span className={styles.valueText}>
                        {formatEth((receipt.gasUsed ?? 0n) * (receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n))} ETH
                      </span>
                    </OverviewRow>
                  )}
                  <OverviewRow label="Gas Price">
                    <span className={styles.valueText}>
                      {formatGasPrice(receipt?.effectiveGasPrice ?? tx.gasPrice)} Gwei
                    </span>
                  </OverviewRow>
                  <OverviewRow label="Gas Limit / Used">
                    <span className={styles.valueText}>
                      {formatGas(tx.gas ?? 0n)} /{' '}
                      {receipt ? formatGas(receipt.gasUsed ?? 0n) : '—'}
                      {receipt && tx.gas ? (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {' '}
                          ({gasUsagePercent(receipt.gasUsed ?? 0n, tx.gas ?? 1n).toFixed(1)}%)
                        </span>
                      ) : null}
                    </span>
                  </OverviewRow>
                  <OverviewRow label="Nonce">
                    <span className={styles.valueText}>{tx.nonce}</span>
                  </OverviewRow>
                </div>
              </div>

              {decoded && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Decoded Function Call</h3>
                    <span className={`${styles.badge} ${styles.badgeEvvm}`}>
                      {decoded.contractKind}.{decoded.functionName}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    {decoded.args.length === 0 ? (
                      <div className={styles.empty}>No arguments</div>
                    ) : (
                      <div className={styles.paramList}>
                        {decoded.args.map((arg, i) => (
                          <div key={i} className={styles.paramRow}>
                            <span className={styles.paramName}>{arg.name}</span>
                            <span className={styles.paramType}>{arg.type}</span>
                            <span className={styles.paramValue}>
                              <ParamValue name={arg.name} type={arg.type} value={arg.value} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {transfers.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>EVVM Token Transfers</h3>
                    <span className={styles.subtitle}>Inferred from function args (EVVM emits no events)</span>
                  </div>
                  <div className={`${styles.cardBodyTight} ${styles.tableScroll}`}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Kind</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Amount</th>
                          <th>Token</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((t, i) => {
                          const token = resolveToken(t.token);
                          return (
                            <tr key={i}>
                              <td>
                                <span className={`${styles.badge} ${styles.badgeEvvm}`}>EVVM</span>
                              </td>
                              <td>
                                <AddressDisplay address={t.from} truncate />
                              </td>
                              <td>
                                {t.toIdentity ? (
                                  <span>
                                    <span className={`${styles.badge} ${styles.badgePrimary}`}>@{t.toIdentity}</span>
                                  </span>
                                ) : (
                                  <AddressDisplay address={t.to} truncate />
                                )}
                              </td>
                              <td>
                                {(() => {
                                  const isMate = token?.symbol === 'MATE' || t.token.toLowerCase() === MATE_TOKEN;
                                  if (!isMate) return t.amount.toLocaleString('en-US');
                                  const human = formatTokenAmount(t.amount, 18);
                                  const [i, d] = human.split('.');
                                  return (i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : ''));
                                })()}
                              </td>
                              <td>
                                <AddressDisplay address={t.token} truncate asToken />
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'normal' }}>
                                {t.note ?? ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'logs' && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                {decodedLogs.length === 0 ? (
                  <div className={styles.empty}>
                    No event logs. EVVM core contracts don&apos;t emit events — state changes live in
                    decoded calldata.
                  </div>
                ) : (
                  decodedLogs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 6,
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span>
                          <span
                            className={`${styles.badge} ${
                              log.source === 'ERC-20'
                                ? styles.badgePrimary
                                : log.source === 'Unknown'
                                ? styles.badgeNeutral
                                : styles.badgeEvvm
                            }`}
                          >
                            {log.source}
                          </span>{' '}
                          <span className={styles.paramName}>{log.eventName ?? '(unknown event)'}</span>
                        </span>
                        <AddressDisplay address={log.address} truncate />
                      </div>
                      {log.args ? (
                        <div className={styles.paramList}>
                          {Object.entries(log.args as Record<string, unknown>)
                            .filter(([k]) => !/^\d+$/.test(k))
                            .map(([name, value], j) => (
                              <div key={j} className={styles.paramRow}>
                                <span className={styles.paramName}>{name}</span>
                                <span className={styles.paramType}>{typeof value}</span>
                                <span className={styles.paramValue}>
                                  <ParamValue name={name} type={typeof value === 'bigint' ? 'uint256' : typeof value} value={value} />
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div>
                          <div className={styles.paramName} style={{ marginBottom: 4 }}>Topics</div>
                          <pre className={styles.code}>{log.topics.join('\n')}</pre>
                          <div className={styles.paramName} style={{ margin: '8px 0 4px' }}>Data</div>
                          <pre className={styles.code}>{log.data}</pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'input' && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <div style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Raw calldata · {tx.input ? (tx.input.length - 2) / 2 : 0} bytes
                </div>
                <pre className={styles.code}>{tx.input || '0x'}</pre>
              </div>
            </div>
          )}
        </>
      )}
    </ExplorerShell>
  );
}

function OverviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}
