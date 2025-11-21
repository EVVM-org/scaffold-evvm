'use client';

import { useEffect, useState } from 'react';
import type { EvvmDeployment } from '@/types/evvm';
import { createPublicClient, http } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { EvvmABI } from '@evvm/viem-signature-library';

/**
 * Hook to load EVVM configuration from environment variables
 * Automatically discovers contract addresses from EVVM core contract
 */
export function useEvvmDeployment() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeployment() {
      try {
        setLoading(true);

        // Read from environment variables
        const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
        const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
        const evvmIDStr = process.env.NEXT_PUBLIC_EVVM_ID;

        if (!evvmAddress) {
          throw new Error('NEXT_PUBLIC_EVVM_ADDRESS not configured in .env');
        }

        if (!chainIdStr) {
          throw new Error('NEXT_PUBLIC_CHAIN_ID not configured in .env');
        }

        const chainId = parseInt(chainIdStr);

        // Select chain based on chainId
        const chain = chainId === 11155111 ? sepolia : chainId === 421614 ? arbitrumSepolia : sepolia;

        // Create viem public client
        const publicClient = createPublicClient({
          chain,
          transport: http(),
        });

        // Try to discover contract addresses from EVVM contract
        let stakingAddress: `0x${string}` | undefined;
        let nameServiceAddress: `0x${string}` | undefined;
        let estimatorAddress: `0x${string}` | undefined;
        let evvmID: number | undefined;

        try {
          // Read addresses from EVVM contract
          [stakingAddress, nameServiceAddress, estimatorAddress, evvmID] = await Promise.all([
            publicClient.readContract({
              address: evvmAddress,
              abi: EvvmABI,
              functionName: 'getStakingAddress',
            }) as Promise<`0x${string}`>,
            publicClient.readContract({
              address: evvmAddress,
              abi: EvvmABI,
              functionName: 'getNameServiceAddress',
            }) as Promise<`0x${string}`>,
            publicClient.readContract({
              address: evvmAddress,
              abi: EvvmABI,
              functionName: 'getEstimatorAddress',
            }) as Promise<`0x${string}`>,
            publicClient.readContract({
              address: evvmAddress,
              abi: EvvmABI,
              functionName: 'getEvvmID',
            }) as Promise<number>,
          ]);

          console.log('✅ Contract discovery successful:', {
            staking: stakingAddress,
            nameService: nameServiceAddress,
            estimator: estimatorAddress,
            evvmID,
          });
        } catch (discoveryError) {
          console.warn('⚠️ Contract discovery failed, using fallback addresses:', discoveryError);
          // Fallback: use zero addresses if discovery fails
          stakingAddress = '0x0000000000000000000000000000000000000000';
          nameServiceAddress = '0x0000000000000000000000000000000000000000';
          estimatorAddress = '0x0000000000000000000000000000000000000000';
          evvmID = evvmIDStr ? parseInt(evvmIDStr) : 0;
        }

        // Build deployment object
        const deploymentData: EvvmDeployment = {
          chainId,
          networkName: chain.name,
          evvm: evvmAddress,
          nameService: nameServiceAddress!,
          staking: stakingAddress!,
          estimator: estimatorAddress!,
          treasury: '0x0000000000000000000000000000000000000000', // Optional
          p2pSwap: undefined, // Optional
          evvmID: evvmID || 0,
          evvmName: undefined,
          registry: undefined,
          admin: undefined, // Not discovered from env
          goldenFisher: undefined,
          activator: undefined,
        };

        setDeployment(deploymentData);
        setError(null);
      } catch (err: any) {
        console.error('❌ Error loading EVVM deployment:', err);
        setError(err.message || 'Failed to load EVVM deployment');
        setDeployment(null);
      } finally {
        setLoading(false);
      }
    }

    loadDeployment();
  }, []);

  return { deployment, loading, error };
}
