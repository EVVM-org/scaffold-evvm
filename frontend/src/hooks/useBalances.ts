'use client';

import { useEffect, useState } from 'react';
import { readContract } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { EvvmABI } from '@evvm/viem-signature-library';
import { MATE_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS } from '@/utils/constants';

type HexString = `0x${string}`;

export interface BalancesState {
  [token: string]: bigint | undefined;
}

export interface UseBalancesReturn {
  balances: BalancesState;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch token balances for the connected account
 * Fetches MATE token and ETH balances from the EVVM contract
 */
export function useBalances(): UseBalancesReturn {
  const { address } = useAccount();
  const { deployment, loading: deploymentLoading } = useEvvmDeployment();

  const [balances, setBalances] = useState<BalancesState>({
    [MATE_TOKEN_ADDRESS]: undefined,
    [ETH_TOKEN_ADDRESS]: undefined,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        abi: EvvmABI,
        address: evvmAddress,
        functionName: 'getBalance',
        args: [user, token],
      });
      return result as bigint;
    } catch (err: any) {
      console.error(`Error fetching balance for token ${token}:`, err);
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

    try {
      const evvmAddress = deployment.evvm as HexString;
      const tokens = [MATE_TOKEN_ADDRESS, ETH_TOKEN_ADDRESS] as HexString[];

      // Fetch all balances in parallel
      const balanceResults = await Promise.allSettled(
        tokens.map(token => getBalance(address, token, evvmAddress))
      );

      const newBalances: BalancesState = {};

      balanceResults.forEach((result, index) => {
        const token = tokens[index];
        if (result.status === 'fulfilled') {
          newBalances[token] = result.value;
        } else {
          console.error(`Failed to fetch balance for ${token}:`, result.reason);
          newBalances[token] = undefined;
        }
      });

      setBalances(newBalances);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      setError(err.message || 'Failed to fetch balances');
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
    refresh,
  };
}
