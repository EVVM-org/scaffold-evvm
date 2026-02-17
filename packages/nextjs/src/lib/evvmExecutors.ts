import type { WalletClient, PublicClient } from 'viem';
import {
  CoreABI,
  StakingABI,
  NameServiceABI,
  execute as evvmExecute,
  createSignerWithViem,
  type SignedAction,
  type ISigner,
} from '@evvm/evvm-js';

// Re-export ABIs for backward compatibility
export { CoreABI, StakingABI, NameServiceABI };

// ============================================
// SIGNED ACTION EXECUTOR
// ============================================

/**
 * Execute a SignedAction using evvm-js execute function
 * This is the new recommended way to execute EVVM transactions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeSignedAction(
  walletClient: WalletClient,
  signedAction: SignedAction<any>
): Promise<`0x${string}`> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signer = await createSignerWithViem(walletClient as any);
  const hash = await evvmExecute(signer, signedAction);
  return hash as `0x${string}`;
}

/**
 * Execute a SignedAction with an existing signer
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeWithSigner(
  signer: ISigner,
  signedAction: SignedAction<any>
): Promise<`0x${string}`> {
  const hash = await evvmExecute(signer, signedAction);
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
    abi: CoreABI,
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
    abi: CoreABI,
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
    functionName: 'getUserAmountStaked',
    args: [account],
  });

  return amount as bigint;
}

/**
 * Check if address is a staker
 * Note: isAddressStaker is on the EVVM contract, not the Staking contract
 */
export async function readIsStaker(
  publicClient: PublicClient,
  evvmAddress: `0x${string}`,
  account: `0x${string}`
): Promise<boolean> {
  const isStaker = await publicClient.readContract({
    address: evvmAddress,
    abi: CoreABI,
    functionName: 'isAddressStaker',
    args: [account],
  });

  return isStaker as boolean;
}

/**
 * Read golden fisher address
 * Uses getGoldenFisher() which returns the current authorized golden fisher
 */
export async function readGoldenFisher(
  publicClient: PublicClient,
  stakingAddress: `0x${string}`
): Promise<`0x${string}`> {
  const goldenFisher = await publicClient.readContract({
    address: stakingAddress,
    abi: StakingABI,
    functionName: 'getGoldenFisher',
    args: [],
  });

  return goldenFisher as `0x${string}`;
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
