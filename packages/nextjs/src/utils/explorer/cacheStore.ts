/**
 * localStorage-backed cache for the explorer. Stores a bounded window of
 * recent blocks + transactions keyed by chainId+Core address so that
 * cache entries from one deployment don't leak into another.
 *
 * bigints are serialized as strings and rehydrated on load.
 */

import type { Block, Transaction } from 'viem';

export type MinedBlock = Block<bigint, true, 'latest'>;
export type CachedTx = Transaction & { blockTimestamp: bigint };

export interface CachePayload {
  blocks: MinedBlock[];
  txs: CachedTx[];
  lastBlock: string | null;
  version: 1;
}

const CACHE_KEY_PREFIX = 'evvmscan:v1:';

export function cacheKey(chainId: number | undefined, coreAddress: string | undefined): string | null {
  if (!chainId) return null;
  return `${CACHE_KEY_PREFIX}${chainId}:${(coreAddress ?? 'no-core').toLowerCase()}`;
}

function reviver(_key: string, value: unknown): unknown {
  // Mark all strings matching a bigint pattern with type hint? Too broad.
  // Instead we rely on structured reviver below.
  return value;
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return `__bigint__:${value.toString()}`;
  return value;
}

function deepRehydrate(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('__bigint__:')) {
    return BigInt(value.slice('__bigint__:'.length));
  }
  if (Array.isArray(value)) return value.map(deepRehydrate);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepRehydrate(v);
    return out;
  }
  return value;
}

export function loadCache(key: string | null): CachePayload | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviver);
    const hydrated = deepRehydrate(parsed) as CachePayload;
    if (hydrated?.version !== 1) return null;
    return hydrated;
  } catch {
    return null;
  }
}

export function saveCache(
  key: string | null,
  blocks: MinedBlock[],
  txs: CachedTx[],
  lastBlock: bigint | null,
): void {
  if (!key || typeof window === 'undefined') return;
  try {
    const payload: CachePayload = {
      version: 1,
      blocks,
      txs,
      lastBlock: lastBlock !== null ? lastBlock.toString() : null,
    };
    window.localStorage.setItem(key, JSON.stringify(payload, replacer));
  } catch {
    // localStorage full or unavailable — silently drop
  }
}

export function clearCache(key: string | null): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Merge two block lists, newest first, dedup by number, capped at `keep`. */
export function mergeBlocks(existing: MinedBlock[], incoming: MinedBlock[], keep: number): MinedBlock[] {
  const seen = new Set<string>();
  const merged: MinedBlock[] = [];
  for (const b of [...incoming, ...existing]) {
    const key = b.number.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(b);
  }
  merged.sort((a, b) => (b.number > a.number ? 1 : b.number < a.number ? -1 : 0));
  return merged.slice(0, keep);
}

/** Merge tx lists newest first, dedup by hash, capped at `keep`. */
export function mergeTxs(existing: CachedTx[], incoming: CachedTx[], keep: number): CachedTx[] {
  const seen = new Set<string>();
  const merged: CachedTx[] = [];
  for (const t of [...incoming, ...existing]) {
    if (seen.has(t.hash)) continue;
    seen.add(t.hash);
    merged.push(t);
  }
  merged.sort((a, b) => {
    const bn = (b.blockNumber ?? 0n) - (a.blockNumber ?? 0n);
    if (bn > 0n) return 1;
    if (bn < 0n) return -1;
    return (b.transactionIndex ?? 0) - (a.transactionIndex ?? 0);
  });
  return merged.slice(0, keep);
}
