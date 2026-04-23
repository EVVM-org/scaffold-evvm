/**
 * Action + pay signature construction for custom EVVM services.
 *
 * Follows the canonical convention documented at
 * https://www.evvm.info/docs/HowToMakeAEVVMService and already implemented
 * inside `@evvm/evvm-js`:
 *
 *   hashPayload = keccak256(abi.encode("<functionName>", ...businessArgs))
 *   message     = "<evvmId>,<senderExecutor>,<hashPayload>,<originExecutor>,<nonce>,<isAsyncExec>"
 *   signature   = personal_sign(message)
 *
 * For publicPay functions the second signature (the EVVM pay) is built by
 * the SDK's `Core.pay()` call, which already embeds the same message shape.
 */

import { encodeAbiParameters, keccak256 } from 'viem';
import { Core, createSignerWithViem, type IPayData, type SignedAction } from '@evvm/evvm-js';

/**
 * Wagmi and `@evvm/evvm-js` resolve viem from different `node_modules`
 * locations, so their WalletClient structural types collide at the compiler
 * level even though they're runtime-compatible. We accept `any` here for
 * the same reason the rest of the signature-constructor code does.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletClient = any;

const MATE_TOKEN = '0x0000000000000000000000000000000000000001' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ---------------------------------------------------------------------------
// Action signature
// ---------------------------------------------------------------------------

export interface ActionSignatureInput {
  /** Signer's wallet (viem WalletClient from wagmi). */
  walletClient: WalletClient;
  /** EVVM instance id. */
  evvmId: bigint;
  /** The service contract itself — acts as `senderExecutor` in the message. */
  serviceAddress: `0x${string}`;
  /** Optional `originExecutor`; `0x0` means "anyone can relay". */
  originExecutor: `0x${string}`;
  /** Action nonce consumed via Core.validateAndConsumeNonce. */
  nonce: bigint;
  /** Sync (ordered) vs async (out-of-order) nonce mode. */
  isAsyncExec: boolean;
  /** Solidity function name string, embedded in the hash payload. */
  functionName: string;
  /** Canonical ABI types of the business args (in declaration order). */
  businessArgTypes: string[];
  /** Business arg values to be abi-encoded together with the function name. */
  businessArgValues: unknown[];
}

export interface BuiltActionSignature {
  signature: `0x${string}`;
  hashPayload: `0x${string}`;
  message: string;
  /** Echo of the plumbing values used, so the caller can fill the tx args. */
  plumbing: {
    senderExecutor: `0x${string}`;
    originExecutor: `0x${string}`;
    nonce: bigint;
    isAsyncExec: boolean;
  };
}

export async function buildActionSignature(
  input: ActionSignatureInput,
): Promise<BuiltActionSignature> {
  const {
    walletClient,
    evvmId,
    serviceAddress,
    originExecutor,
    nonce,
    isAsyncExec,
    functionName,
    businessArgTypes,
    businessArgValues,
  } = input;

  const encoded = encodeAbiParameters(
    [{ type: 'string' }, ...businessArgTypes.map((t) => ({ type: t }))],
    [functionName, ...businessArgValues],
  );
  const hashPayload = keccak256(encoded);

  const message = `${evvmId},${serviceAddress},${hashPayload},${originExecutor},${nonce},${isAsyncExec}`;

  if (!walletClient.account) {
    throw new Error('Wallet client has no connected account');
  }

  const signature = await walletClient.signMessage({
    account: walletClient.account,
    message,
  });

  return {
    signature: signature as `0x${string}`,
    hashPayload,
    message,
    plumbing: {
      senderExecutor: serviceAddress,
      originExecutor,
      nonce,
      isAsyncExec,
    },
  };
}

// ---------------------------------------------------------------------------
// Pay signature (via Core.pay — delegates to evvm-js so the envelope stays
// consistent with the rest of the frontend)
// ---------------------------------------------------------------------------

export interface PaySignatureInput {
  walletClient: WalletClient;
  evvmAddress: `0x${string}`;
  evvmId: bigint;
  /** Service contract address — becomes both `senderExecutor` and the
   *  `toAddress` since the user is paying the service. */
  serviceAddress: `0x${string}`;
  /** Optional origin executor. */
  originExecutor: `0x${string}`;
  /** Token to pay with. Defaults to the principal token (MATE). */
  tokenAddress?: `0x${string}`;
  amount: bigint;
  priorityFee: bigint;
  nonce: bigint;
  isAsyncExec: boolean;
}

export async function buildPaySignature(
  input: PaySignatureInput,
): Promise<SignedAction<IPayData>> {
  const {
    walletClient,
    evvmAddress,
    evvmId,
    serviceAddress,
    originExecutor,
    tokenAddress = MATE_TOKEN,
    amount,
    priorityFee,
    nonce,
    isAsyncExec,
  } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signer = await createSignerWithViem(walletClient as any);
  const chainId = await signer.getChainId();
  const core = new Core({ signer, address: evvmAddress, chainId, evvmId });

  return core.pay({
    toAddress: serviceAddress,
    tokenAddress,
    amount,
    priorityFee,
    nonce,
    isAsyncExec,
    senderExecutor: serviceAddress,
    originExecutor,
  });
}

export { MATE_TOKEN, ZERO_ADDRESS };
