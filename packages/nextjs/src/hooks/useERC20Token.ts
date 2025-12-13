/**
 * Generic ERC20 Token Hooks
 *
 * Provides hooks for interacting with any ERC20 token:
 * - Fetch token metadata (name, symbol, decimals)
 * - Check token balance
 * - Check allowance
 * - Approve spending
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { useState, useEffect } from 'react';

// Standard ERC20 ABI (minimum required functions)
const ERC20_ABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export interface TokenMetadata {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Hook to fetch token metadata (name, symbol, decimals)
 */
export function useTokenMetadata(tokenAddress: Address | undefined) {
  const { data: name, isLoading: nameLoading, error: nameError } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
    query: {
      enabled: !!tokenAddress,
    },
  });

  const { data: symbol, isLoading: symbolLoading, error: symbolError } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
    },
  });

  const { data: decimals, isLoading: decimalsLoading, error: decimalsError } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
    },
  });

  const isLoading = nameLoading || symbolLoading || decimalsLoading;
  const error = nameError || symbolError || decimalsError;

  const metadata: TokenMetadata | null =
    tokenAddress && name && symbol && decimals !== undefined
      ? {
          address: tokenAddress,
          name: name as string,
          symbol: symbol as string,
          decimals: Number(decimals),
        }
      : null;

  return {
    metadata,
    isLoading,
    error,
    isValid: !!metadata && !error,
  };
}

/**
 * Hook to fetch token balance for connected account
 */
export function useTokenBalance(tokenAddress: Address | undefined) {
  const { address: account } = useAccount();

  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: {
      enabled: !!tokenAddress && !!account,
    },
  });

  // Get decimals for formatting
  const { metadata } = useTokenMetadata(tokenAddress);

  const formatted =
    balance !== undefined && metadata
      ? formatUnits(balance as bigint, metadata.decimals)
      : '0';

  return {
    balance: balance as bigint | undefined,
    formatted,
    decimals: metadata?.decimals,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check token allowance for a spender
 */
export function useTokenAllowance(tokenAddress: Address | undefined, spender: Address | undefined) {
  const { address: account } = useAccount();

  const {
    data: allowance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: account && spender ? [account, spender] : undefined,
    query: {
      enabled: !!tokenAddress && !!account && !!spender,
    },
  });

  // Get decimals for formatting
  const { metadata } = useTokenMetadata(tokenAddress);

  const formatted =
    allowance !== undefined && metadata
      ? formatUnits(allowance as bigint, metadata.decimals)
      : '0';

  return {
    allowance: allowance as bigint | undefined,
    formatted,
    decimals: metadata?.decimals,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to approve token spending
 */
export function useTokenApprove(tokenAddress: Address | undefined) {
  const { metadata } = useTokenMetadata(tokenAddress);
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = (spender: Address, amount: string) => {
    if (!tokenAddress || !metadata) {
      throw new Error('Token not loaded');
    }

    const amountBigInt = parseUnits(amount, metadata.decimals);

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amountBigInt],
    });
  };

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to validate token address
 * Checks if address is a valid ERC20 token
 */
export function useValidateToken(tokenAddress: string | undefined) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if it's a valid address format
  const isValidAddress = tokenAddress && /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);

  const { metadata, isLoading, error: fetchError } = useTokenMetadata(
    isValidAddress ? (tokenAddress as Address) : undefined
  );

  useEffect(() => {
    if (!tokenAddress) {
      setIsValid(null);
      setError(null);
      return;
    }

    if (!isValidAddress) {
      setIsValid(false);
      setError('Invalid address format');
      return;
    }

    if (fetchError) {
      setIsValid(false);
      setError('Not a valid ERC20 token');
      return;
    }

    if (metadata) {
      setIsValid(true);
      setError(null);
    }
  }, [tokenAddress, isValidAddress, metadata, fetchError]);

  return {
    isValid,
    isLoading,
    error,
    metadata,
  };
}
