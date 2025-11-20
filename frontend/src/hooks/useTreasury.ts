/**
 * Treasury Hooks
 *
 * Provides hooks for interacting with EVVM Treasury contract:
 * - Deposit tokens
 * - Withdraw tokens
 * - Check Treasury balance
 */

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { useTokenMetadata } from './useERC20Token';

// Treasury ABI (minimal interface)
const TREASURY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'evvmAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

/**
 * Hook to deposit tokens to Treasury
 */
export function useTreasuryDeposit(
  treasuryAddress: Address | undefined,
  tokenAddress: Address | undefined
) {
  const { metadata } = useTokenMetadata(tokenAddress);
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = (amount: string) => {
    if (!treasuryAddress || !tokenAddress || !metadata) {
      throw new Error('Treasury or token not loaded');
    }

    const amountBigInt = parseUnits(amount, metadata.decimals);

    // Check if it's ETH (0x0) or ERC20 token
    const isETH =
      tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000';

    writeContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: 'deposit',
      args: [tokenAddress, amountBigInt],
      value: isETH ? amountBigInt : undefined, // Send ETH if depositing native token
    });
  };

  return {
    deposit,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to withdraw tokens from Treasury
 */
export function useTreasuryWithdraw(
  treasuryAddress: Address | undefined,
  tokenAddress: Address | undefined
) {
  const { metadata } = useTokenMetadata(tokenAddress);
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = (amount: string) => {
    if (!treasuryAddress || !tokenAddress || !metadata) {
      throw new Error('Treasury or token not loaded');
    }

    const amountBigInt = parseUnits(amount, metadata.decimals);

    writeContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, amountBigInt],
    });
  };

  return {
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to get EVVM address from Treasury
 */
export function useTreasuryEvvmAddress(treasuryAddress: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'evvmAddress',
    query: {
      enabled: !!treasuryAddress,
    },
  });

  return {
    evvmAddress: data as Address | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to check if user needs to approve before deposit
 */
export function useNeedsApproval(
  allowanceFormatted: string,
  depositAmount: string
): boolean {
  if (!depositAmount || parseFloat(depositAmount) <= 0) return false;

  try {
    const depositNum = parseFloat(depositAmount);
    const allowanceNum = parseFloat(allowanceFormatted);
    return depositNum > allowanceNum;
  } catch {
    return false;
  }
}
