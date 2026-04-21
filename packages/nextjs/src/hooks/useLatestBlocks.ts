'use client';

import { useEffect, useRef, useState } from 'react';
import type { Block, Transaction } from 'viem';
import { useExplorerClient } from './useExplorerClient';

export type MinedBlock = Block<bigint, true, 'latest'>;

export interface LatestData {
  blocks: MinedBlock[];
  txs: (Transaction & { blockTimestamp: bigint })[];
  lastBlock: bigint | null;
  connected: boolean;
  error: string | null;
}

interface Options {
  keep?: number;
  txKeep?: number;
  intervalMs?: number;
}

/**
 * Poll the local chain and keep a rolling window of latest blocks + txs.
 * Used by the explorer home page.
 */
export function useLatestBlocks(opts: Options = {}): LatestData {
  const { keep = 15, txKeep = 25, intervalMs = 1500 } = opts;
  const client = useExplorerClient();
  const [state, setState] = useState<LatestData>({
    blocks: [],
    txs: [],
    lastBlock: null,
    connected: false,
    error: null,
  });
  const lastBlockRef = useRef<bigint | null>(null);
  const seenHashesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    lastBlockRef.current = null;
    seenHashesRef.current = new Set();

    async function tick() {
      try {
        const latest = await client.getBlockNumber();
        if (cancelled) return;

        if (lastBlockRef.current === null) {
          // First connection: seed at latest - 1 so we capture the current block as "new"
          lastBlockRef.current = latest > 0n ? latest - 1n : latest;
          setState((prev) => ({ ...prev, connected: true, error: null }));
        }

        const from = lastBlockRef.current!;
        if (latest <= from) {
          setState((prev) => (prev.connected ? prev : { ...prev, connected: true, error: null }));
          return;
        }

        const toFetch: bigint[] = [];
        const span = latest - from;
        const limit = span > 20n ? 20n : span; // cap catchup to avoid huge bursts
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
          const mergedBlocks = [...[...nonNull].reverse(), ...prev.blocks].slice(0, keep);
          const newTxs: (Transaction & { blockTimestamp: bigint })[] = [];
          for (const block of nonNull) {
            for (const tx of block.transactions) {
              if (typeof tx !== 'object') continue;
              if (seenHashesRef.current.has(tx.hash)) continue;
              seenHashesRef.current.add(tx.hash);
              newTxs.push({ ...(tx as Transaction), blockTimestamp: block.timestamp });
            }
          }
          const mergedTxs = [...newTxs.reverse(), ...prev.txs].slice(0, txKeep);
          return {
            ...prev,
            blocks: mergedBlocks,
            txs: mergedTxs,
            lastBlock: lastBlockRef.current,
            connected: true,
            error: null,
          };
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
  }, [client, keep, txKeep, intervalMs]);

  return state;
}
