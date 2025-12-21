'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { switchChain } from '@wagmi/core';
import { config } from '@/config';
import type { EvvmDeployment } from '@/types/evvm';

export interface NetworkValidationResult {
  isCorrectNetwork: boolean;
  walletChainId: number | undefined;
  requiredChainId: number | undefined;
  networkName: string;
  requiresSwitch: boolean;
  switchNetwork: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook to validate wallet is on the same network as the EVVM deployment
 * Provides automatic network switching functionality
 */
export function useNetworkValidation(
  deployment: EvvmDeployment | null
): NetworkValidationResult {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const [isSwitching, setIsSwitching] = useState(false);

  const requiredChainId = deployment?.chainId;
  const networkName = deployment?.networkName || 'Unknown Network';
  const isCorrectNetwork = isConnected && walletChainId === requiredChainId;
  const requiresSwitch = isConnected && !isCorrectNetwork && !!requiredChainId;

  const switchNetwork = async () => {
    if (!requiredChainId || isSwitching) return;

    try {
      setIsSwitching(true);
      await switchChain(config, { chainId: requiredChainId });
      console.log(`Switched to network ${requiredChainId}`);
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      // Don't throw - let the UI handle the error display
      alert(
        `Failed to switch network: ${error.message}\n\nPlease manually switch to ${networkName} in your wallet.`
      );
    } finally {
      setIsSwitching(false);
    }
  };

  // Auto-log network mismatch
  useEffect(() => {
    if (requiresSwitch) {
      console.warn(
        `⚠️ Network Mismatch Detected!\n` +
          `Wallet is on chain ${walletChainId}, but EVVM is deployed on chain ${requiredChainId} (${networkName})\n` +
          `Please switch networks to interact with the EVVM.`
      );
    }
  }, [requiresSwitch, walletChainId, requiredChainId, networkName]);

  return {
    isCorrectNetwork,
    walletChainId,
    requiredChainId,
    networkName,
    requiresSwitch,
    switchNetwork,
    isConnected,
  };
}

/**
 * Get human-readable network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Ethereum Sepolia',
    421614: 'Arbitrum Sepolia',
    42161: 'Arbitrum One',
    31337: 'Localhost',
  };
  return networks[chainId] || `Chain ${chainId}`;
}
