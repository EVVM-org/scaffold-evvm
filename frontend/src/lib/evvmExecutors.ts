import type { WalletClient, PublicClient } from 'viem';
import type { PayInputData, DispersePayInputData, StakingInputData } from '@/types/evvm';
import { parseSignature } from './evvmSignatures';

// Minimal EVVM ABI for the functions we need
const EVVM_ABI = [
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to_address', type: 'address' },
      { name: 'to_identity', type: 'string' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'priority', type: 'bool' },
      { name: 'executor', type: 'address' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'dispersePay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'priorityFee', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'priority', type: 'bool' },
      { name: 'executor', type: 'address' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getNextCurrentSyncNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const STAKING_ABI = [
  {
    name: 'stakePublic',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getStakedAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isAddressStaker',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const NAMESERVICE_ABI = [
  {
    name: 'preRegisterIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'identity', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'registerIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'identity', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getOwnerOfIdentity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'identity', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// ============================================
// PAYMENT EXECUTORS
// ============================================

/**
 * Execute a pay transaction
 */
export async function executePay(
  walletClient: WalletClient,
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  data: PayInputData
): Promise<`0x${string}`> {
  const { r, s, v } = parseSignature(data.signature);

  const hash = await walletClient.writeContract({
    address: evvmAddress,
    abi: EVVM_ABI,
    functionName: 'pay',
    args: [
      data.from,
      data.to_address,
      data.to_identity,
      data.token,
      data.amount,
      data.priorityFee,
      data.nonce,
      data.priority,
      data.executor as `0x${string}`,
      v,
      r,
      s,
    ],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any);

  return hash;
}

/**
 * Execute a disperse pay transaction
 */
export async function executeDispersePay(
  walletClient: WalletClient,
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  data: DispersePayInputData
): Promise<`0x${string}`> {
  const { r, s, v } = parseSignature(data.signature);

  const recipients = data.recipients.map((r) => r.address);
  const amounts = data.recipients.map((r) => r.amount);

  const hash = await walletClient.writeContract({
    address: evvmAddress,
    abi: EVVM_ABI,
    functionName: 'dispersePay',
    args: [
      data.from,
      data.token,
      recipients,
      amounts,
      data.priorityFee,
      data.nonce,
      data.priority,
      data.executor as `0x${string}`,
      v,
      r,
      s,
    ],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any);

  return hash;
}

// ============================================
// STAKING EXECUTORS
// ============================================

/**
 * Execute a staking transaction
 */
export async function executeStaking(
  walletClient: WalletClient,
  publicClient: PublicClient,
  stakingAddress: `0x${string}`,
  data: StakingInputData
): Promise<`0x${string}`> {
  const { r, s, v } = parseSignature(data.signature);

  const hash = await walletClient.writeContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: 'stakePublic',
    args: [data.from, data.amount, data.nonce, v, r, s],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any);

  return hash;
}

// ============================================
// READ FUNCTIONS
// ============================================

/**
 * Read balance from EVVM
 */
export async function readBalance(
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  account: `0x${string}`,
  token: `0x${string}`
): Promise<bigint> {
  const balance = await publicClient.readContract({
    address: evvmAddress,
    abi: EVVM_ABI,
    functionName: 'getBalance',
    args: [account, token],
  });

  return balance as bigint;
}

/**
 * Read next sync nonce for an account
 */
export async function readNextNonce(
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  const nonce = await publicClient.readContract({
    address: evvmAddress,
    abi: EVVM_ABI,
    functionName: 'getNextCurrentSyncNonce',
    args: [account],
  });

  return nonce as bigint;
}

/**
 * Read staked amount
 */
export async function readStakedAmount(
  publicClient: PublicClient,
  stakingAddress: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  const amount = await publicClient.readContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: 'getStakedAmount',
    args: [account],
  });

  return amount as bigint;
}

/**
 * Check if address is a staker
 */
export async function readIsStaker(
  publicClient: PublicClient,
  stakingAddress: `0x${string}`,
  account: `0x${string}`
): Promise<boolean> {
  const isStaker = await publicClient.readContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: 'isAddressStaker',
    args: [account],
  });

  return isStaker as boolean;
}

/**
 * Read username owner
 */
export async function readUsernameOwner(
  publicClient: PublicClient,
  nameServiceAddress: `0x${string}`,
  username: string
): Promise<`0x${string}`> {
  const owner = await publicClient.readContract({
    address: nameServiceAddress,
    abi: NAMESERVICE_ABI,
    functionName: 'getOwnerOfIdentity',
    args: [username],
  });

  return owner as `0x${string}`;
}
