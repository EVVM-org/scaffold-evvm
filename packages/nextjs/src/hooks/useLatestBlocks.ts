'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useExplorerClient } from './useExplorerClient';
import { useEvvmDeployment } from './useEvvmDeployment';
import {
  cacheKey,
  clearCache,
  loadCache,
  saveCache,
  mergeBlocks,
  mergeTxs,
  type MinedBlock,
  type CachedTx,
} from '@/utils/explorer';

export interface LatestData {
  blocks: MinedBlock[];
  txs: CachedTx[];
  lastBlock: bigint | null;
  connected: boolean;
  error: string | null;
}

interface Options {
  /** How many blocks to keep around (memory + cache). Defaults to 100. */
  keep?: number;
  /** How many txs to keep around. Defaults to 300. */
  txKeep?: number;
  /** Poll interval in ms. Defaults to 1500. */
  intervalMs?: number;
  /** Number of historical blocks to fetch on first mount (cold cache). */
  backfill?: number;
}

function extractTxs(blocks: MinedBlock[]): CachedTx[] {
  const txs: CachedTx[] = [];
  for (const block of blocks) {
    for (const tx of block.transactions) {
      if (typeof tx !== 'object') continue;
      txs.push({ ...(tx as any), blockTimestamp: block.timestamp });
    }
  }
  return txs;
}

/**
 * Poll the local chain, keeping a rolling window of blocks and txs.
 *
 * Anvil and Hardhat both restart at block 0 on every deployment, so on
 * mount we do NOT hydrate from localStorage eagerly. We first fetch the
 * chain head and verify the cached anchor block still matches on-chain.
 * Only then is the cache restored; otherwise it is discarded and the
 * polling loop backfills recent blocks from the fresh chain.
 */
export function useLatestBlocks(opts: Options = {}): LatestData {
  const { keep = 100, txKeep = 300, intervalMs = 1500, backfill = 25 } = opts;
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();
  const key = useMemo(() => cacheKey(deployment?.chainId, deployment?.evvm), [deployment]);

  const [state, setState] = useState<LatestData>({
    blocks: [],
    txs: [],
    lastBlock: null,
    connected: false,
    error: null,
  });

  const lastBlockRef = useRef<bigint | null>(null);
  const anchorRef = useRef<{ number: bigint; hash: `0x${string}` } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Always start the effect with an empty in-memory state so we never
    // flash stale blocks from a previous chain.
    lastBlockRef.current = null;
    anchorRef.current = null;
    setState({ blocks: [], txs: [], lastBlock: null, connected: false, error: null });

    async function validateCacheAndSeed(): Promise<void> {
      const cached = loadCache(key);
      let latest: bigint;
      try {
        latest = await client.getBlockNumber();
      } catch (err: any) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, connected: false, error: err?.message ?? 'Connection failed' }));
        return;
      }
      if (cancelled) return;

      // If we have a cache, verify it matches the current chain. If the
      // cached head is above the chain's head, this is definitely a fresh
      // chain (anvil/hardhat restart at block 0). If the hash at the cached
      // head no longer matches, it's also a different chain.
      let cacheIsValid = false;
      if (cached && cached.blocks.length > 0) {
        const cachedHead = cached.blocks[0];
        if (cachedHead.number <= latest) {
          const onChain = await client.getBlock({ blockNumber: cachedHead.number }).catch(() => null);
          if (cancelled) return;
          if (onChain && onChain.hash === cachedHead.hash) {
            cacheIsValid = true;
          }
        }
      }

      if (cacheIsValid && cached) {
        lastBlockRef.current = cached.lastBlock ? BigInt(cached.lastBlock) : cached.blocks[0].number;
        anchorRef.current = { number: cached.blocks[0].number, hash: cached.blocks[0].hash };
        setState({
          blocks: cached.blocks,
          txs: cached.txs,
          lastBlock: lastBlockRef.current,
          connected: true,
          error: null,
        });
      } else {
        // Fresh chain (or first visit): wipe any stale cache and backfill.
        if (cached) clearCache(key);
        const from = latest > BigInt(backfill) ? latest - BigInt(backfill) + 1n : 0n;
        const toFetch: bigint[] = [];
        for (let n = from; n <= latest; n++) toFetch.push(n);
        const fetched = await Promise.all(
          toFetch.map((n) =>
            client.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
          ),
        );
        if (cancelled) return;
        const nonNull = fetched.filter((b) => b !== null) as MinedBlock[];
        lastBlockRef.current = latest;
        const newest = nonNull.find((b) => b.number === latest) ?? nonNull[nonNull.length - 1];
        anchorRef.current = newest && newest.hash ? { number: newest.number, hash: newest.hash } : null;
        const blocks = mergeBlocks([], nonNull, keep);
        const txs = mergeTxs([], extractTxs(nonNull), txKeep);
        saveCache(key, blocks, txs, latest);
        setState({ blocks, txs, lastBlock: latest, connected: true, error: null });
      }
    }

    async function tick(): Promise<void> {
      try {
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        // Detect chain restart after validation, too (e.g., user flushes
        // while the page is open).
        if (lastBlockRef.current !== null && latest < lastBlockRef.current) {
          lastBlockRef.current = null;
          anchorRef.current = null;
          clearCache(key);
          setState({ blocks: [], txs: [], lastBlock: null, connected: true, error: null });
          await validateCacheAndSeed();
          return;
        }

        if (lastBlockRef.current === null) {
          await validateCacheAndSeed();
          return;
        }

        const from = lastBlockRef.current;
        if (latest <= from) {
          setState((prev) => (prev.connected ? prev : { ...prev, connected: true, error: null }));
          return;
        }
        const span = latest - from;
        const limit = span > 50n ? 50n : span;
        const toFetch: bigint[] = [];
        for (let i = 1n; i <= limit; i++) toFetch.push(from + i);
        const fetched = await Promise.all(
          toFetch.map((n) =>
            client.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
          ),
        );
        if (cancelled) return;
        const nonNull = fetched.filter((b) => b !== null) as MinedBlock[];
        if (nonNull.length === 0) return;
        lastBlockRef.current = nonNull[nonNull.length - 1].number;

        setState((prev) => {
          const blocks = mergeBlocks(prev.blocks, nonNull, keep);
          const txs = mergeTxs(prev.txs, extractTxs(nonNull), txKeep);
          saveCache(key, blocks, txs, lastBlockRef.current);
          anchorRef.current =
            blocks[0] && blocks[0].hash ? { number: blocks[0].number, hash: blocks[0].hash } : null;
          return { blocks, txs, lastBlock: lastBlockRef.current, connected: true, error: null };
        });
      } catch (err: any) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, connected: false, error: err?.message ?? 'Connection failed' }));
      }
    }

    // Kick off: validate cache, then start polling.
    validateCacheAndSeed();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, key, keep, txKeep, intervalMs, backfill]);

  return state;
}
