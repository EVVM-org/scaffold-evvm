'use client';

import { useEffect, useState } from 'react';
import type { EvvmDeployment } from '@/types/evvm';
import { createPublicClient, http } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { EvvmABI } from '@evvm/viem-signature-library';
import { loadEvvmConfig, clearEvvmConfig } from '@/lib/evvmConfigStorage';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Check if localStorage config is stale compared to env config
 * Uses NEXT_PUBLIC_CONFIG_VERSION and address/ID comparison
 */
function isConfigStale(storedConfig: any): boolean {
  const envVersion = process.env.NEXT_PUBLIC_CONFIG_VERSION;
  const envAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS;
  const envEvvmId = process.env.NEXT_PUBLIC_EVVM_ID;

  // If env has a config version and it's newer than stored timestamp, config is stale
  if (envVersion && storedConfig.timestamp) {
    const envVersionNum = parseInt(envVersion);
    if (envVersionNum > storedConfig.timestamp) {
      console.log('🔄 Config version changed, localStorage is stale');
      return true;
    }
  }

  // If env address differs from stored, config is stale
  if (envAddress && storedConfig.evvm &&
      envAddress.toLowerCase() !== storedConfig.evvm.toLowerCase()) {
    console.log('🔄 EVVM address changed, localStorage is stale');
    return true;
  }

  // If env has EVVM ID but stored doesn't match, config is stale
  if (envEvvmId && storedConfig.evvmID !== parseInt(envEvvmId)) {
    console.log('🔄 EVVM ID changed, localStorage is stale');
    return true;
  }

  return false;
}

/**
 * Check if stored config has invalid/zero addresses that need rediscovery
 */
function hasInvalidAddresses(storedConfig: any): boolean {
  // Check if critical contract addresses are zero or missing
  const criticalAddresses = [
    storedConfig.staking,
    storedConfig.nameService,
    storedConfig.estimator,
  ];

  for (const addr of criticalAddresses) {
    if (!addr || addr === ZERO_ADDRESS) {
      console.log('🔄 localStorage has zero addresses, needs rediscovery');
      return true;
    }
  }

  return false;
}

/**
 * Hook to load EVVM configuration
 * Priority: localStorage config (if valid) > environment variables
 * Automatically discovers contract addresses from EVVM core contract if using env vars
 */
export function useEvvmDeployment() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeployment() {
      try {
        setLoading(true);
        console.log('🔄 useEvvmDeployment: Starting to load deployment...');

        // 1. Check localStorage first
        const storedConfig = loadEvvmConfig();
        if (storedConfig) {
          console.log('📦 useEvvmDeployment: Found localStorage config:', {
            evvm: storedConfig.evvm,
            evvmID: storedConfig.evvmID,
            timestamp: storedConfig.timestamp
          });
          // Check if localStorage config is stale or has invalid addresses
          if (isConfigStale(storedConfig) || hasInvalidAddresses(storedConfig)) {
            console.log('🗑️ useEvvmDeployment: Clearing stale/invalid localStorage config');
            clearEvvmConfig();
            // Fall through to load from env vars
          } else {
            console.log('✅ useEvvmDeployment: Using localStorage config');
            setDeployment(storedConfig);
            setError(null);
            setLoading(false);
            return;
          }
        } else {
          console.log('📭 useEvvmDeployment: No localStorage config found');
        }

        // 2. Fallback: Read from environment variables
        console.log('🔧 useEvvmDeployment: Loading from environment variables...');
        const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS as `0x${string}`;
        const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
        const evvmIDStr = process.env.NEXT_PUBLIC_EVVM_ID;

        // Contract addresses from CLI deployment (fast path)
        const envStakingAddress = process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}` | undefined;
        const envEstimatorAddress = process.env.NEXT_PUBLIC_ESTIMATOR_ADDRESS as `0x${string}` | undefined;
        const envNameServiceAddress = process.env.NEXT_PUBLIC_NAMESERVICE_ADDRESS as `0x${string}` | undefined;
        const envTreasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` | undefined;
        const envP2pSwapAddress = process.env.NEXT_PUBLIC_P2PSWAP_ADDRESS as `0x${string}` | undefined;

        // Debug: Log all env vars
        console.log('🔧 useEvvmDeployment: Environment variables:', {
          evvmAddress,
          chainIdStr,
          evvmIDStr,
          envStakingAddress,
          envEstimatorAddress,
          envNameServiceAddress,
          envTreasuryAddress,
          envP2pSwapAddress
        });

        if (!evvmAddress) {
          console.error('❌ useEvvmDeployment: NEXT_PUBLIC_EVVM_ADDRESS is missing');
          throw new Error('NEXT_PUBLIC_EVVM_ADDRESS not configured in .env');
        }

        if (!chainIdStr) {
          console.error('❌ useEvvmDeployment: NEXT_PUBLIC_CHAIN_ID is missing');
          throw new Error('NEXT_PUBLIC_CHAIN_ID not configured in .env');
        }

        const chainId = parseInt(chainIdStr);

        // Select chain based on chainId
        const chain = chainId === 11155111 ? sepolia : chainId === 421614 ? arbitrumSepolia : sepolia;

        // Check if we have contract addresses from env (CLI deployment)
        const hasEnvAddresses = envStakingAddress && envStakingAddress !== ZERO_ADDRESS &&
                                envNameServiceAddress && envNameServiceAddress !== ZERO_ADDRESS &&
                                envEstimatorAddress && envEstimatorAddress !== ZERO_ADDRESS;

        let stakingAddress: `0x${string}`;
        let nameServiceAddress: `0x${string}`;
        let estimatorAddress: `0x${string}`;
        let treasuryAddress: `0x${string}`;
        let p2pSwapAddress: `0x${string}` | undefined;
        let evvmID: number;

        if (hasEnvAddresses) {
          // Fast path: use addresses from env vars (populated by CLI)
          console.log('✅ Using contract addresses from environment variables');
          stakingAddress = envStakingAddress!;
          nameServiceAddress = envNameServiceAddress!;
          estimatorAddress = envEstimatorAddress!;
          treasuryAddress = envTreasuryAddress || ZERO_ADDRESS as `0x${string}`;
          p2pSwapAddress = envP2pSwapAddress;
          evvmID = evvmIDStr ? parseInt(evvmIDStr) : 0;
        } else {
          // Slow path: discover addresses from on-chain EVVM contract
          console.log('🔍 Discovering contract addresses from EVVM contract...');

          // Create viem public client
          const publicClient = createPublicClient({
            chain,
            transport: http(),
          });

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

            // Treasury is not stored in EVVM contract, use env or zero
            treasuryAddress = envTreasuryAddress || ZERO_ADDRESS as `0x${string}`;
            p2pSwapAddress = envP2pSwapAddress;

            console.log('✅ Contract discovery successful:', {
              staking: stakingAddress,
              nameService: nameServiceAddress,
              estimator: estimatorAddress,
              evvmID,
            });
          } catch (discoveryError) {
            console.warn('⚠️ Contract discovery failed, using fallback addresses:', discoveryError);
            // Fallback: use zero addresses if discovery fails
            stakingAddress = ZERO_ADDRESS as `0x${string}`;
            nameServiceAddress = ZERO_ADDRESS as `0x${string}`;
            estimatorAddress = ZERO_ADDRESS as `0x${string}`;
            treasuryAddress = ZERO_ADDRESS as `0x${string}`;
            p2pSwapAddress = undefined;
            evvmID = evvmIDStr ? parseInt(evvmIDStr) : 0;
          }
        }

        // Build deployment object
        const deploymentData: EvvmDeployment = {
          chainId,
          networkName: chain.name,
          evvm: evvmAddress,
          nameService: nameServiceAddress,
          staking: stakingAddress,
          estimator: estimatorAddress,
          treasury: treasuryAddress,
          p2pSwap: p2pSwapAddress,
          evvmID: evvmID || 0,
          evvmName: undefined,
          registry: undefined,
          admin: undefined,
          goldenFisher: undefined,
          activator: undefined,
        };

        console.log('✅ useEvvmDeployment: Deployment loaded successfully:', {
          evvm: deploymentData.evvm,
          evvmID: deploymentData.evvmID,
          chainId: deploymentData.chainId,
          staking: deploymentData.staking,
          nameService: deploymentData.nameService,
          estimator: deploymentData.estimator,
        });

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

    // Listen for configuration changes
    const handleConfigChange = () => {
      console.log('🔄 Configuration changed, reloading...');
      loadDeployment();
    };

    // Listen for storage events (from other tabs) and custom events (same tab)
    window.addEventListener('storage', handleConfigChange);
    window.addEventListener('evvm-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleConfigChange);
      window.removeEventListener('evvm-config-changed', handleConfigChange);
    };
  }, []);

  return { deployment, loading, error };
}
