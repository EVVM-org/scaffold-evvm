'use client';

import { AddressDisplay } from './AddressDisplay';
import { formatAmountWithRaw, looksLikeTokenAmount } from '@/utils/explorer';
import styles from '@/styles/pages/Explorer.module.css';

interface ParamValueProps {
  name: string;
  type: string;
  value: unknown;
}

function isAddressLike(v: unknown): v is `0x${string}` {
  return typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);
}

function renderFallback(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(renderFallback).join(', ') + ']';
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

export function ParamValue({ name, type, value }: ParamValueProps) {
  if (isAddressLike(value)) {
    return <AddressDisplay address={value} />;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`${styles.badge} ${value ? styles.badgeSuccess : styles.badgeNeutral}`}>
        {value ? 'true' : 'false'}
      </span>
    );
  }

  // Coerce string-encoded bigints (from cache rehydration) + real bigints
  let asBigInt: bigint | null = null;
  if (typeof value === 'bigint') asBigInt = value;
  else if (typeof value === 'string' && /^\d+$/.test(value)) {
    try {
      asBigInt = BigInt(value);
    } catch {
      asBigInt = null;
    }
  }

  if (asBigInt !== null && looksLikeTokenAmount(name, type, asBigInt)) {
    const { human, raw, symbol } = formatAmountWithRaw(asBigInt);
    return (
      <span>
        <span style={{ fontWeight: 500 }}>
          {human} <span className={`${styles.badge} ${styles.badgeEvvm}`}>{symbol}</span>
        </span>{' '}
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>({raw} wei)</span>
      </span>
    );
  }

  if (asBigInt !== null) {
    return <span>{asBigInt.toLocaleString('en-US')}</span>;
  }

  return <span>{renderFallback(value)}</span>;
}
