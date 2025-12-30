'use client';

import { useState, useRef, useEffect } from 'react';
import type { DebugEntry } from '@/types/evvm';
import styles from '@/styles/components/DebugConsole.module.css';

interface DebugConsoleProps {
  entries: DebugEntry[];
  onClear?: () => void;
  title?: string;
  autoScroll?: boolean;
  maxHeight?: string;
}

export function DebugConsole({
  entries,
  onClear,
  title = 'Debug Console',
  autoScroll = true,
  maxHeight = '500px'
}: DebugConsoleProps) {
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  const [filter, setFilter] = useState<string>('all');
  const entriesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (autoScroll && entriesRef.current) {
      entriesRef.current.scrollTop = entriesRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  const toggleExpand = (index: number) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    // Get base time string
    const timeStr = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Add milliseconds manually
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  const formatPayload = (payload: any): string => {
    if (typeof payload === 'string') return payload;
    const seen = new WeakSet();
    try {
      return JSON.stringify(payload, (key, value) => {
        // Handle BigInt
        if (typeof value === 'bigint') {
          return value.toString() + 'n';
        }
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        // Skip functions
        if (typeof value === 'function') {
          return '[Function]';
        }
        return value;
      }, 2);
    } catch {
      return String(payload);
    }
  };

  const getEntryClass = (type: string): string => {
    switch (type) {
      case 'request':
        return styles.request;
      case 'response':
        return styles.response;
      case 'error':
        return styles.error;
      case 'info':
        return styles.info;
      case 'tx':
        return styles.tx;
      case 'block':
        return styles.block;
      case 'signature':
        return styles.signature;
      case 'wallet':
        return styles.wallet;
      default:
        return '';
    }
  };

  const getEntryIcon = (type: string): string => {
    switch (type) {
      case 'request':
        return '→';
      case 'response':
        return '←';
      case 'error':
        return '✗';
      case 'info':
        return 'ℹ';
      case 'tx':
        return '⧫';
      case 'block':
        return '◼';
      case 'signature':
        return '✎';
      case 'wallet':
        return '⬡';
      default:
        return '•';
    }
  };

  const filterTypes = [
    { value: 'all', label: 'All' },
    { value: 'tx', label: 'Transactions' },
    { value: 'block', label: 'Blocks' },
    { value: 'signature', label: 'Signatures' },
    { value: 'error', label: 'Errors' },
    { value: 'info', label: 'Info' },
  ];

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter(e => e.type === filter);

  if (entries.length === 0) {
    return (
      <div className={styles.console}>
        <div className={styles.header}>
          <h4>{title}</h4>
        </div>
        <div className={styles.empty}>
          <p>No debug entries yet. Actions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.console}>
      <div className={styles.header}>
        <h4>{title}</h4>
        <div className={styles.controls}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {filterTypes.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
          {onClear && (
            <button onClick={onClear} className={styles.clearButton}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className={styles.entries} ref={entriesRef} style={{ maxHeight }}>
        {filteredEntries.map((entry, index) => (
          <div key={index} className={`${styles.entry} ${getEntryClass(entry.type)}`}>
            <div className={styles.entryHeader} onClick={() => toggleExpand(index)}>
              <span className={styles.icon}>{getEntryIcon(entry.type)}</span>
              <span className={styles.typeLabel}>{entry.type.toUpperCase()}</span>
              <span className={styles.label}>{entry.label}</span>
              {entry.txHash && (
                <span className={styles.txHash}>
                  {entry.txHash.slice(0, 10)}...{entry.txHash.slice(-6)}
                </span>
              )}
              {entry.blockNumber && (
                <span className={styles.blockNum}>#{entry.blockNumber}</span>
              )}
              <span className={styles.timestamp}>{formatTimestamp(entry.timestamp)}</span>
              <span className={styles.expandIcon}>
                {expanded[index] ? '▼' : '▶'}
              </span>
            </div>

            {expanded[index] && (
              <div className={styles.entryBody}>
                {entry.txHash && (
                  <div className={styles.txHashFull}>
                    <strong>TX Hash:</strong> {entry.txHash}
                  </div>
                )}
                <pre className={styles.payload}>{formatPayload(entry.payload)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <span>{filteredEntries.length} / {entries.length} entries</span>
      </div>
    </div>
  );
}
