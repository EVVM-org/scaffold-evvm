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
 * Persists to localStorage so reloading the page preserves history, and
 * backfills recent blocks on a cold start.
 */
export function useLatestBlocks(opts: Options = {}): LatestData {
  const { keep = 100, txKeep = 300, intervalMs = 1500, backfill = 25 } = opts;
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();
  const key = useMemo(() => cacheKey(deployment?.chainId, deployment?.evvm), [deployment]);

  const [state, setState] = useState<LatestData>(() => {
    const cached = loadCache(key);
    if (cached) {
      return {
        blocks: cached.blocks,
        txs: cached.txs,
        lastBlock: cached.lastBlock ? BigInt(cached.lastBlock) : null,
        connected: false,
        error: null,
      };
    }
    return { blocks: [], txs: [], lastBlock: null, connected: false, error: null };
  });

  const lastBlockRef = useRef<bigint | null>(state.lastBlock);
  const hasBackfilledRef = useRef(false);
  const anchorRef = useRef<{ number: bigint; hash: `0x${string}` } | null>(
    state.blocks[0] && state.blocks[0].hash
      ? { number: state.blocks[0].number, hash: state.blocks[0].hash }
      : null,
  );
  const getAnchorFromState = () => anchorRef.current;

  // Reload state when the cache key changes (e.g., redeploy / new chain).
  useEffect(() => {
    const cached = loadCache(key);
    hasBackfilledRef.current = false;
    if (cached) {
      lastBlockRef.current = cached.lastBlock ? BigInt(cached.lastBlock) : null;
      anchorRef.current =
        cached.blocks[0] && cached.blocks[0].hash
          ? { number: cached.blocks[0].number, hash: cached.blocks[0].hash }
          : null;
      setState({
        blocks: cached.blocks,
        txs: cached.txs,
        lastBlock: lastBlockRef.current,
        connected: false,
        error: null,
      });
    } else {
      lastBlockRef.current = null;
      anchorRef.current = null;
      setState({ blocks: [], txs: [], lastBlock: null, connected: false, error: null });
    }
  }, [key]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        // Detect a chain restart (flush + redeploy) in two ways:
        // (1) current head dropped below our cached head, or
        // (2) the block at our cached head has a different hash than what
        //     we stored — i.e., same block number but a different chain.
        // If either fires, wipe everything and fall into the cold-start path.
        let restartDetected = lastBlockRef.current !== null && latest < lastBlockRef.current;

        if (!restartDetected && lastBlockRef.current !== null && !hasBackfilledRef.current) {
          // On cache-hydrated first tick, verify the anchor block still matches.
          const anchor = getAnchorFromState();
          if (anchor) {
            const onChain = await client
              .getBlock({ blockNumber: anchor.number })
              .catch(() => null);
            if (cancelled) return;
            if (!onChain || onChain.hash !== anchor.hash) {
              restartDetected = true;
            }
          }
        }

        if (restartDetected) {
          lastBlockRef.current = null;
          hasBackfilledRef.current = false;
          anchorRef.current = null;
          clearCache(key);
          setState({ blocks: [], txs: [], lastBlock: null, connected: true, error: null });
        }

        // First connection: either backfill (cold cache) or catch up from last seen.
        if (lastBlockRef.current === null) {
          const startFrom = latest > BigInt(backfill) ? latest - BigInt(backfill) + 1n : 0n;
          const toFetch: bigint[] = [];
          for (let n = startFrom; n <= latest; n++) toFetch.push(n);
          const fetched = await Promise.all(
            toFetch.map((n) =>
              client.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
            ),
          );
          if (cancelled) return;
          const nonNull = fetched.filter((b) => b !== null) as MinedBlock[];
          lastBlockRef.current = latest;
          hasBackfilledRef.current = true;
          setState((prev) => {
            const blocks = mergeBlocks(prev.blocks, nonNull, keep);
            const txs = mergeTxs(prev.txs, extractTxs(nonNull), txKeep);
            saveCache(key, blocks, txs, lastBlockRef.current);
            anchorRef.current =
              blocks[0] && blocks[0].hash
                ? { number: blocks[0].number, hash: blocks[0].hash }
                : null;
            return { blocks, txs, lastBlock: lastBlockRef.current, connected: true, error: null };
          });
          return;
        }

        const from = lastBlockRef.current;
        if (latest <= from) {
          setState((prev) => (prev.connected ? prev : { ...prev, connected: true, error: null }));
          return;
        }

        const span = latest - from;
        const limit = span > 50n ? 50n : span; // cap catchup bursts
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
          return { blocks, txs, lastBlock: lastBlockRef.current, connected: true, error: null };
        });
      } catch (err: any) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, connected: false, error: err?.message ?? 'Connection failed' }));
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, key, keep, txKeep, intervalMs, backfill]);

  return state;
}
