'use client';

import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { createPublicClient, http, type PublicClient } from 'viem';
import { hardhat } from 'viem/chains';

/**
 * Dedicated viem PublicClient for the explorer. Binds to the current chainId
 * and the local RPC (http://127.0.0.1:8545 by default). Memoized to avoid
 * creating a new client on every render, which would break polling loops.
 */
export function useExplorerClient(): PublicClient {
  const chainId = useChainId();
  return useMemo(() => {
    return createPublicClient({
      chain: { ...hardhat, id: chainId || 31337 },
      transport: http('http://127.0.0.1:8545'),
    });
  }, [chainId]);
}
