import type { WalletClient, PublicClient } from 'viem';
import type { PayInputData, DispersePayInputData, StakingInputData } from '@/types/evvm';
import { config } from '@/config';
import { writeContract } from '@wagmi/core';
import { EvvmABI, StakingABI, NameServiceABI } from '@evvm/viem-signature-library';

// ============================================
// PAYMENT EXECUTORS
// ============================================

/**
 * Execute a pay transaction
 * Following the reference implementation pattern from EVVM-Signature-Constructor-Front
 */
export async function executePay(
  walletClient: WalletClient,
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  data: PayInputData
): Promise<`0x${string}`> {
  if (!data) {
    throw new Error("No data to execute payment");
  }

  console.log("Executing pay with args:", {
    from: data.from,
    to_address: data.to_address,
    to_identity: data.to_identity,
    token: data.token,
    amount: data.amount.toString(),
    priorityFee: data.priorityFee.toString(),
    nonce: data.nonce.toString(),
    priority: data.priority,
    executor: data.executor,
    signature: data.signature,
  });

  const hash = await writeContract(config, {
    abi: EvvmABI,
    address: evvmAddress,
    functionName: "pay",
    args: [
      data.from,
      data.to_address,
      data.to_identity,
      data.token,
      data.amount,
      data.priorityFee,
      data.nonce,
      data.priority,
      data.executor,
      data.signature,  // Full signature, NOT v,r,s
    ],
  });

  console.log("Pay transaction submitted:", hash);
  return hash as `0x${string}`;
}

/**
 * Execute a disperse pay transaction
 * Following the reference implementation pattern from EVVM-Signature-Constructor-Front
 */
export async function executeDispersePay(
  walletClient: WalletClient,
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  data: DispersePayInputData
): Promise<`0x${string}`> {
  if (!data) {
    throw new Error("No data to execute disperse payment");
  }

  // Transform to match library's DispersePayInputData format
  const toData = data.recipients.map(r => ({
    to_address: r.address,
    to_identity: "",
    amount: r.amount,
  }));

  console.log("Executing dispersePay with args:", {
    from: data.from,
    toData,
    token: data.token,
    amount: data.recipients.reduce((sum, r) => sum + r.amount, 0n).toString(),
    priorityFee: data.priorityFee.toString(),
    nonce: data.nonce.toString(),
    priority: data.priority,
    executor: data.executor,
    signature: data.signature,
  });

  const hash = await writeContract(config, {
    abi: EvvmABI,
    address: evvmAddress,
    functionName: "dispersePay",
    args: [
      data.from,
      toData,
      data.token,
      data.recipients.reduce((sum, r) => sum + r.amount, 0n),
      data.priorityFee,
      data.nonce,
      data.priority,
      data.executor,
      data.signature,  // Full signature, NOT v,r,s
    ],
  });

  console.log("Disperse pay transaction submitted:", hash);
  return hash as `0x${string}`;
}

// ============================================
// STAKING EXECUTORS
// ============================================

/**
 * Execute a staking transaction
 * Following the reference implementation pattern
 */
export async function executeStaking(
  walletClient: WalletClient,
  publicClient: PublicClient,
  stakingAddress: `0x${string}`,
  data: StakingInputData
): Promise<`0x${string}`> {
  if (!data) {
    throw new Error("No data to execute staking");
  }

  console.log("Executing stakePublic with args:", {
    from: data.from,
    amount: data.amount.toString(),
    nonce: data.nonce.toString(),
    signature: data.signature,
  });

  const hash = await writeContract(config, {
    abi: StakingABI,
    address: stakingAddress,
    functionName: "stakePublic",
    args: [
      data.from,
      data.amount,
      data.nonce,
      data.signature,  // Full signature, NOT v,r,s
    ],
  });

  console.log("Staking transaction submitted:", hash);
  return hash as `0x${string}`;
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
    abi: EvvmABI,
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
    abi: EvvmABI,
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
    abi: StakingABI,
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
    abi: StakingABI,
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
    abi: NameServiceABI,
    functionName: 'getOwnerOfIdentity',
    args: [username],
  });

  return owner as `0x${string}`;
}
