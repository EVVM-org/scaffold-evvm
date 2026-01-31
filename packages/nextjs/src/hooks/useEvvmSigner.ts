'use client';

import { useCallback } from 'react';
import { getWalletClient } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { createSignerWithViem, type ISigner } from '@evvm/evvm-js';

/**
 * Hook to create an EVVM signer from the connected wallet
 * Uses wagmi's wallet client and wraps it with evvm-js signer
 */
export function useEvvmSigner() {
  const { address, isConnected } = useAccount();

  /**
   * Get a signer instance for the connected wallet
   * Must be called after wallet is connected
   */
  const getSigner = useCallback(async (): Promise<ISigner> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const walletClient = await getWalletClient(config);
    if (!walletClient) {
      throw new Error('Failed to get wallet client');
    }

    console.log('🔑 [evvm-js] Creating signer with createSignerWithViem from @evvm/evvm-js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signer = await createSignerWithViem(walletClient as any);
    console.log('✅ [evvm-js] Signer created successfully:', { address: signer.address });
    return signer;
  }, [isConnected, address]);

  return {
    getSigner,
    isConnected,
    address,
  };
}
