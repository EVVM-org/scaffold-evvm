'use client';

import { useEffect, useState } from 'react';
import { readContract } from '@wagmi/core';
import { useAccount, useChainId } from 'wagmi';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { CoreABI } from '@evvm/evvm-js';
import { MATE_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS } from '@/utils/constants';
import { isContractDeployed } from '@/lib/viemClients';

type HexString = `0x${string}`;

export interface BalancesState {
  [token: string]: bigint | undefined;
}

export interface UseBalancesReturn {
  balances: BalancesState;
  loading: boolean;
  error: string | null;
  contractMissing: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch token balances for the connected account
 * Fetches MATE token and ETH balances from the EVVM contract
 */
export function useBalances(): UseBalancesReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { deployment, loading: deploymentLoading } = useEvvmDeployment();

  const [balances, setBalances] = useState<BalancesState>({
    [MATE_TOKEN_ADDRESS]: undefined,
    [ETH_TOKEN_ADDRESS]: undefined,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [contractMissing, setContractMissing] = useState<boolean>(false);

  /**
   * Fetches the balance of a specific token for the user
   */
  const getBalance = async (
    user: HexString,
    token: HexString,
    evvmAddress: HexString
  ): Promise<bigint> => {
    try {
      const result = await readContract(config, {
        abi: CoreABI,
        address: evvmAddress,
        functionName: 'getBalance',
        args: [user, token],
      });
      return result as bigint;
    } catch (err: any) {
      // Check if the error is because the contract doesn't exist
      if (err.message?.includes('returned no data') || err.message?.includes('0x')) {
        throw new Error('CONTRACT_NOT_FOUND');
      }
      throw err;
    }
  };

  /**
   * Fetches balances for all tokens
   */
  const fetchBalances = async () => {
    if (!address || !deployment?.evvm) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setContractMissing(false);

    try {
      const evvmAddress = deployment.evvm as HexString;

      // First check if the contract exists
      const contractExists = await isContractDeployed(chainId, evvmAddress);
      if (!contractExists) {
        setContractMissing(true);
        setError('EVVM contract not found. The blockchain may have been reset. Please redeploy using "npm run wizard".');
        setLoading(false);
        return;
      }

      const tokens = [MATE_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS] as HexString[];

      // Fetch all balances in parallel
      const balanceResults = await Promise.allSettled(
        tokens.map(token => getBalance(address, token, evvmAddress))
      );

      const newBalances: BalancesState = {};
      let hasContractError = false;

      balanceResults.forEach((result, index) => {
        const token = tokens[index];
        if (result.status === 'fulfilled') {
          newBalances[token] = result.value;
        } else {
          const reason = result.reason?.message || '';
          if (reason === 'CONTRACT_NOT_FOUND') {
            hasContractError = true;
          }
          newBalances[token] = undefined;
        }
      });

      if (hasContractError) {
        setContractMissing(true);
        setError('EVVM contract not found. The blockchain may have been reset. Please redeploy using "npm run wizard".');
      } else {
        setBalances(newBalances);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      if (err.message?.includes('returned no data') || err.message?.includes('CONTRACT_NOT_FOUND')) {
        setContractMissing(true);
        setError('EVVM contract not found. The blockchain may have been reset. Please redeploy using "npm run wizard".');
      } else {
        setError(err.message || 'Failed to fetch balances');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh balances manually
   */
  const refresh = async () => {
    await fetchBalances();
  };

  // Fetch balances when address or deployment changes
  useEffect(() => {
    if (!deploymentLoading) {
      fetchBalances();
    }
  }, [address, deployment?.evvm, deploymentLoading]);

  return {
    balances,
    loading: loading || deploymentLoading,
    error,
    contractMissing,
    refresh,
  };
}
