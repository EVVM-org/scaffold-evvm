'use client';

import { useState } from 'react';
import type { DebugEntry } from '@/types/evvm';
import styles from '@/styles/components/DebugConsole.module.css';

interface DebugConsoleProps {
  entries: DebugEntry[];
  onClear?: () => void;
}

export function DebugConsole({ entries, onClear }: DebugConsoleProps) {
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});

  const toggleExpand = (index: number) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatPayload = (payload: any): string => {
    if (typeof payload === 'string') return payload;
    return JSON.stringify(payload, null, 2);
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
      default:
        return '•';
    }
  };

  if (entries.length === 0) {
    return (
      <div className={styles.console}>
        <div className={styles.header}>
          <h4>Debug Console</h4>
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
        <h4>Debug Console</h4>
        {onClear && (
          <button onClick={onClear} className={styles.clearButton}>
            Clear
          </button>
        )}
      </div>

      <div className={styles.entries}>
        {entries.map((entry, index) => (
          <div key={index} className={`${styles.entry} ${getEntryClass(entry.type)}`}>
            <div className={styles.entryHeader} onClick={() => toggleExpand(index)}>
              <span className={styles.icon}>{getEntryIcon(entry.type)}</span>
              <span className={styles.label}>{entry.label}</span>
              <span className={styles.timestamp}>{formatTimestamp(entry.timestamp)}</span>
              <span className={styles.expandIcon}>
                {expanded[index] ? '▼' : '▶'}
              </span>
            </div>

            {expanded[index] && (
              <div className={styles.entryBody}>
                <pre className={styles.payload}>{formatPayload(entry.payload)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
