import { keccak256, toHex, type WalletClient } from 'viem';

/**
 * EVVM Signature Builder
 * Implements EIP-191 signature standard for EVVM transactions
 *
 * Message format: "<evvmId>,<functionName>,<param1>,...,<paramN>"
 * Signature: sign(keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))
 */

// Function selectors (4-byte hex)
export const FUNCTION_SELECTORS = {
  // Payment functions
  PAY_STANDARD: '0x4faa1fa2',
  PAY_PRIORITY: '0xf4e1895b',
  DISPERSE_PAY_STANDARD: '0x4faa1fa2',
  DISPERSE_PAY_PRIORITY: '0xf4e1895b',

  // Staking functions
  STAKING_PUBLIC: '0x48b22717',

  // NameService functions
  PREREGISTER: '0x5d232a55',
  REGISTER: '0xa5ef78b2',
} as const;

/**
 * Construct a message for EVVM
 * Format: selector,param1,param2,...
 */
function constructMessage(selector: string, ...params: string[]): string {
  return [selector, ...params].join(',');
}

/**
 * Sign a message using EIP-191 standard
 */
async function signMessage(
  walletClient: WalletClient,
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  const signature = await walletClient.signMessage({
    account,
    message,
  });
  return signature;
}

// ============================================
// PAYMENT SIGNATURES
// ============================================

export interface PayMessageParams {
  evvmID: bigint;
  to: string; // Can be address or username
  token: `0x${string}`;
  amount: bigint;
  priorityFee: bigint;
  nonce: bigint;
  priority: boolean;
  executor: `0x${string}`;
}

/**
 * Build and sign a payment message
 */
export async function buildAndSignPay(
  walletClient: WalletClient,
  account: `0x${string}`,
  params: PayMessageParams
): Promise<{ message: string; signature: `0x${string}` }> {
  const selector = params.priority ? FUNCTION_SELECTORS.PAY_PRIORITY : FUNCTION_SELECTORS.PAY_STANDARD;

  const message = constructMessage(
    selector,
    params.evvmID.toString(),
    account, // from
    params.to, // to (address or username)
    params.token,
    params.amount.toString(),
    params.priorityFee.toString(),
    params.nonce.toString(),
    params.executor
  );

  const signature = await signMessage(walletClient, account, message);

  return { message, signature };
}

export interface DispersePayRecipient {
  address: `0x${string}`;
  amount: bigint;
}

export interface DispersePayMessageParams {
  evvmID: bigint;
  token: `0x${string}`;
  recipients: DispersePayRecipient[];
  priorityFee: bigint;
  nonce: bigint;
  priority: boolean;
  executor: `0x${string}`;
}

/**
 * Build and sign a disperse payment message
 */
export async function buildAndSignDispersePay(
  walletClient: WalletClient,
  account: `0x${string}`,
  params: DispersePayMessageParams
): Promise<{ message: string; signature: `0x${string}` }> {
  const selector = params.priority
    ? FUNCTION_SELECTORS.DISPERSE_PAY_PRIORITY
    : FUNCTION_SELECTORS.DISPERSE_PAY_STANDARD;

  // Format recipients: address1,amount1,address2,amount2,...
  const recipientParams: string[] = [];
  for (const recipient of params.recipients) {
    recipientParams.push(recipient.address, recipient.amount.toString());
  }

  const message = constructMessage(
    selector,
    params.evvmID.toString(),
    account, // from
    params.token,
    params.priorityFee.toString(),
    params.nonce.toString(),
    params.executor,
    ...recipientParams
  );

  const signature = await signMessage(walletClient, account, message);

  return { message, signature };
}

// ============================================
// STAKING SIGNATURES
// ============================================

export interface StakingMessageParams {
  evvmID: bigint;
  amount: bigint;
  nonce: bigint;
}

/**
 * Build and sign a staking message (public staking)
 */
export async function buildAndSignStaking(
  walletClient: WalletClient,
  account: `0x${string}`,
  params: StakingMessageParams
): Promise<{ message: string; signature: `0x${string}` }> {
  const message = constructMessage(
    FUNCTION_SELECTORS.STAKING_PUBLIC,
    params.evvmID.toString(),
    account, // from
    params.amount.toString(),
    params.nonce.toString()
  );

  const signature = await signMessage(walletClient, account, message);

  return { message, signature };
}

// ============================================
// NAME SERVICE SIGNATURES
// ============================================

export interface PreRegisterMessageParams {
  evvmID: bigint;
  username: string;
  nonce: bigint;
}

/**
 * Build and sign a pre-registration message
 */
export async function buildAndSignPreRegister(
  walletClient: WalletClient,
  account: `0x${string}`,
  params: PreRegisterMessageParams
): Promise<{ message: string; signature: `0x${string}` }> {
  const message = constructMessage(
    FUNCTION_SELECTORS.PREREGISTER,
    params.evvmID.toString(),
    account,
    params.username,
    params.nonce.toString()
  );

  const signature = await signMessage(walletClient, account, message);

  return { message, signature };
}

export interface RegisterMessageParams {
  evvmID: bigint;
  username: string;
  nonce: bigint;
}

/**
 * Build and sign a registration message
 */
export async function buildAndSignRegister(
  walletClient: WalletClient,
  account: `0x${string}`,
  params: RegisterMessageParams
): Promise<{ message: string; signature: `0x${string}` }> {
  const message = constructMessage(
    FUNCTION_SELECTORS.REGISTER,
    params.evvmID.toString(),
    account,
    params.username,
    params.nonce.toString()
  );

  const signature = await signMessage(walletClient, account, message);

  return { message, signature };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse a signature to extract r, s, v components
 */
export function parseSignature(signature: `0x${string}`): {
  r: `0x${string}`;
  s: `0x${string}`;
  v: number;
} {
  const sig = signature.slice(2); // Remove 0x
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  const v = parseInt(sig.slice(128, 130), 16);

  return { r, s, v };
}

/**
 * Verify that a message was signed by a specific address
 * (For testing/debugging purposes)
 */
export function getMessageHash(message: string): `0x${string}` {
  const messageBytes = toHex(message);
  return keccak256(messageBytes);
}
