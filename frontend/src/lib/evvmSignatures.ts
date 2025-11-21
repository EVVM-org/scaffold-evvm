/**
 * EVVM Signature Constructors
 *
 * This file contains ALL signature building functions for EVVM operations.
 * Uses the official @evvm/viem-signature-library for signature construction.
 *
 * IMPORTANT: All functions follow the exact patterns from EVVM-Signature-Constructor-Front
 */

import { getAccountWithRetry } from '@/utils/getAccountWithRetry';
import { getWalletClient } from '@wagmi/core';
import { config } from '@/config';
import {
  EVVMSignatureBuilder,
  StakingSignatureBuilder,
  NameServiceSignatureBuilder,
  P2PSwapSignatureBuilder,
  // Type imports
  PayInputData,
  DispersePayInputData,
  DispersePayMetadata,
  GoldenStakingInputData,
  PresaleStakingInputData,
  PublicStakingInputData,
  PreRegistrationUsernameInputData,
  RegistrationUsernameInputData,
  MakeOfferInputData,
  WithdrawOfferInputData,
  AcceptOfferInputData,
  RenewUsernameInputData,
  AddCustomMetadataInputData,
  RemoveCustomMetadataInputData,
  FlushCustomMetadataInputData,
  FlushUsernameInputData,
  MakeOrderInputData,
  CancelOrderInputData,
  // DispatchOrderFillProportionalFeeInputData, // Not exported in current library version
  // DispatchOrderFillFixedFeeInputData, // Not exported in current library version
  hashPreRegisteredUsername,
} from '@evvm/viem-signature-library';

// ====================================================================================
// PAYMENT SIGNATURES
// ====================================================================================

export interface SignPayParams {
  evvmID: string | number;
  to: string; // Address or username
  tokenAddress: `0x${string}`;
  amount: string | number;
  priorityFee: string | number;
  nonce: string | number;
  priority: boolean;
  executor: `0x${string}`;
}

/**
 * Sign a single payment transaction
 * EXACT pattern from PaySignaturesComponent.tsx
 */
export async function signPay(params: SignPayParams): Promise<{
  signature: string;
  inputData: PayInputData;
}> {
  // 1. Get wallet data with retry
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  // 2. Get wallet client
  const walletClient = await getWalletClient(config);

  // 3. Create signature builder
  const signatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // 4. Sign
  const signature = await signatureBuilder.signPay(
    BigInt(params.evvmID),
    params.to,
    params.tokenAddress,
    BigInt(params.amount),
    BigInt(params.priorityFee),
    BigInt(params.nonce),
    params.priority,
    params.executor
  );

  // 5. Build input data
  const inputData: PayInputData = {
    from: walletData.address as `0x${string}`,
    to_address: params.to.startsWith('0x')
      ? (params.to as `0x${string}`)
      : '0x0000000000000000000000000000000000000000',
    to_identity: params.to.startsWith('0x') ? '' : params.to,
    token: params.tokenAddress,
    amount: BigInt(params.amount),
    priorityFee: BigInt(params.priorityFee),
    nonce: BigInt(params.nonce),
    priority: params.priority,
    executor: params.executor,
    signature,
  };

  return { signature, inputData };
}

export interface SignDispersePayParams {
  evvmID: string | number;
  toData: DispersePayMetadata[];
  tokenAddress: `0x${string}`;
  totalAmount: string | number;
  priorityFee: string | number;
  nonce: string | number;
  priority: boolean;
  executor: `0x${string}`;
}

/**
 * Sign a disperse payment transaction (multiple recipients)
 * EXACT pattern from DispersePayComponent.tsx
 */
export async function signDispersePay(params: SignDispersePayParams): Promise<{
  signature: string;
  inputData: DispersePayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const signature = await signatureBuilder.signDispersePay(
    BigInt(params.evvmID),
    params.toData,
    params.tokenAddress,
    BigInt(params.totalAmount),
    BigInt(params.priorityFee),
    BigInt(params.nonce),
    params.priority,
    params.executor
  );

  const inputData: DispersePayInputData = {
    from: walletData.address as `0x${string}`,
    toData: params.toData,
    token: params.tokenAddress,
    amount: BigInt(params.totalAmount),
    priorityFee: BigInt(params.priorityFee),
    priority: params.priority,
    nonce: BigInt(params.nonce),
    executor: params.executor,
    signature,
  };

  return { signature, inputData };
}

// ====================================================================================
// STAKING SIGNATURES
// ====================================================================================

export interface SignGoldenStakingParams {
  evvmID: string | number;
  stakingAddress: `0x${string}`;
  isStaking: boolean;
  amountOfStaking: number;
  nonce: string | number;
  priority: boolean;
}

/**
 * Sign golden staking transaction
 *
 * CRITICAL FIX: Uses EVVMSignatureBuilder.signPay() directly instead of
 * StakingSignatureBuilder.signGoldenStaking() because the library's
 * signGoldenStaking doesn't correctly handle the priorityFlag parameter.
 *
 * Golden staking ALWAYS uses sync mode (priorityFlag: false), as enforced
 * by the Staking contract which calls getNextCurrentSyncNonce(msg.sender).
 */
export async function signGoldenStaking(params: SignGoldenStakingParams): Promise<{
  goldenStakingData: GoldenStakingInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const amountOfToken =
    BigInt(params.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

  const walletClient = await getWalletClient(config);

  // CRITICAL: Use EVVMSignatureBuilder directly, not StakingSignatureBuilder
  const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // Create signature using signPay with explicit priorityFlag: false
  const signaturePay = await evvmSignatureBuilder.signPay(
    BigInt(params.evvmID),                     // evvmID
    params.stakingAddress,                      // to (staking contract)
    '0x0000000000000000000000000000000000000001' as `0x${string}`, // token (MATE)
    amountOfToken,                             // amount
    BigInt(0),                                 // priorityFee (always 0)
    BigInt(params.nonce),                      // nonce (sync nonce)
    false,                                     // priorityFlag (MUST be false)
    params.stakingAddress                      // executor (staking contract)
  );

  return {
    goldenStakingData: {
      isStaking: params.isStaking,
      amountOfStaking: BigInt(params.amountOfStaking),
      signature_EVVM: signaturePay,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.stakingAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: amountOfToken,
      priorityFee: BigInt(0),
      nonce: BigInt(params.nonce),
      priority: false, // Golden staking ALWAYS uses sync mode
      executor: params.stakingAddress,
      signature: signaturePay,
    },
  };
}

export interface SignPresaleStakingParams {
  evvmID: string | number;
  stakingAddress: `0x${string}`;
  isStaking: boolean;
  nonce: string | number;
  priorityFee_EVVM: string | number;
  nonce_EVVM: string | number;
  priorityFlag_EVVM: boolean;
}

/**
 * Sign presale staking transaction (dual signature)
 * EXACT pattern from PresaleStakingComponent.tsx
 */
export async function signPresaleStaking(params: SignPresaleStakingParams): Promise<{
  presaleStakingData: PresaleStakingInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const amountOfToken = (1 * 10 ** 18).toLocaleString('fullwide', {
    useGrouping: false,
  });

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (StakingSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signPresaleStaking(
      BigInt(params.evvmID),
      params.stakingAddress,
      params.isStaking,
      BigInt(params.nonce),
      BigInt(params.priorityFee_EVVM),
      BigInt(amountOfToken),
      BigInt(params.nonce_EVVM),
      params.priorityFlag_EVVM
    );

  return {
    presaleStakingData: {
      isStaking: params.isStaking,
      user: walletData.address as `0x${string}`,
      nonce: BigInt(params.nonce),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      priorityFlag_EVVM: params.priorityFlag_EVVM,
      nonce_EVVM: BigInt(params.nonce_EVVM),
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.stakingAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(amountOfToken),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonce_EVVM),
      priority: params.priorityFlag_EVVM,
      executor: params.stakingAddress,
      signature: paySignature,
    },
  };
}

export interface SignPublicStakingParams {
  evvmID: string | number;
  stakingAddress: `0x${string}`;
  isStaking: boolean;
  amountOfStaking: number;
  nonceStaking: string | number;
  priorityFee: string | number;
  nonceEVVM: string | number;
  priority: boolean;
}

/**
 * Sign public staking transaction (dual signature)
 * EXACT pattern from PublicStakingComponent.tsx
 */
export async function signPublicStaking(params: SignPublicStakingParams): Promise<{
  publicStakingData: PublicStakingInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const amountOfToken =
    BigInt(params.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (StakingSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signPublicStaking(
      BigInt(params.evvmID),
      params.stakingAddress,
      params.isStaking,
      BigInt(params.amountOfStaking),
      BigInt(params.nonceStaking),
      amountOfToken,
      BigInt(params.priorityFee),
      BigInt(params.nonceEVVM),
      params.priority
    );

  return {
    publicStakingData: {
      isStaking: params.isStaking,
      user: walletData.address as `0x${string}`,
      nonce: BigInt(params.nonceStaking),
      amountOfStaking: BigInt(params.amountOfStaking),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee),
      priorityFlag_EVVM: params.priority,
      nonce_EVVM: BigInt(params.nonceEVVM),
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.stakingAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(amountOfToken),
      priorityFee: BigInt(params.priorityFee),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priority,
      executor: params.stakingAddress,
      signature: paySignature,
    },
  };
}

// ====================================================================================
// NAMESERVICE SIGNATURES
// ====================================================================================

export interface SignPreRegistrationUsernameParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  clowNumber: string | number;
  nonce: string | number;
  priorityFee_EVVM: string | number;
  nonce_EVVM: string | number;
  priorityFlag_EVVM: boolean;
}

/**
 * Sign pre-registration username (dual signature)
 * EXACT pattern from PreRegistrationUsernameComponent.tsx
 */
export async function signPreRegistrationUsername(
  params: SignPreRegistrationUsernameParams
): Promise<{
  preRegistrationData: PreRegistrationUsernameInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signPreRegistrationUsername(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.clowNumber),
      BigInt(params.nonce),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonce_EVVM),
      params.priorityFlag_EVVM
    );

  const hashUsername = hashPreRegisteredUsername(
    params.username,
    BigInt(params.clowNumber)
  );

  return {
    preRegistrationData: {
      user: walletData.address as `0x${string}`,
      hashPreRegisteredUsername:
        hashUsername.toLowerCase().slice(0, 2) +
        hashUsername.toUpperCase().slice(2),
      nonce: BigInt(params.nonce),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonce_EVVM),
      priorityFlag_EVVM: params.priorityFlag_EVVM,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonce_EVVM),
      priority: params.priorityFlag_EVVM,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignRegistrationUsernameParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  clowNumber: string | number;
  nonceNameService: string | number;
  rewardAmount: bigint;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign registration username (dual signature)
 * EXACT pattern from RegistrationUsernameComponent.tsx
 */
export async function signRegistrationUsername(
  params: SignRegistrationUsernameParams
): Promise<{
  registrationData: RegistrationUsernameInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signRegistrationUsername(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.clowNumber),
      BigInt(params.nonceNameService),
      params.rewardAmount,
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    registrationData: {
      user: walletData.address as `0x${string}`,
      nonce: BigInt(params.nonceNameService),
      username: params.username,
      clowNumber: BigInt(params.clowNumber),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: params.rewardAmount * BigInt(100),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignMakeOfferParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  expireDate: string | number;
  amount: string | number;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign make offer for username (dual signature)
 * EXACT pattern from MakeOfferComponent.tsx
 */
export async function signMakeOffer(params: SignMakeOfferParams): Promise<{
  makeOfferData: MakeOfferInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signMakeOffer(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.expireDate),
      BigInt(params.amount),
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    makeOfferData: {
      username: params.username,
      expireDate: BigInt(params.expireDate),
      // buyer: walletData.address as `0x${string}`, // Removed - not in library type definition
      amount: BigInt(params.amount),
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(params.amount),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignWithdrawOfferParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign withdraw offer for username (dual signature)
 * EXACT pattern from WithdrawOfferComponent.tsx
 */
export async function signWithdrawOffer(
  params: SignWithdrawOfferParams
): Promise<{
  withdrawOfferData: WithdrawOfferInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signWithdrawOffer(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    withdrawOfferData: {
      username: params.username,
      buyer: walletData.address as `0x${string}`,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignAcceptOfferParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign accept offer for username (dual signature)
 * EXACT pattern from AcceptOfferComponent.tsx
 */
export async function signAcceptOffer(params: SignAcceptOfferParams): Promise<{
  acceptOfferData: AcceptOfferInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signAcceptOffer(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    acceptOfferData: {
      username: params.username,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignRenewUsernameParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign renew username (dual signature)
 * EXACT pattern from RenewUsernameComponent.tsx
 */
export async function signRenewUsername(
  params: SignRenewUsernameParams
): Promise<{
  renewUsernameData: RenewUsernameInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signRenewUsername(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    renewUsernameData: {
      username: params.username,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignAddCustomMetadataParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  key: string;
  value: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign add custom metadata to username (dual signature)
 * EXACT pattern from AddCustomMetadataComponent.tsx
 */
export async function signAddCustomMetadata(
  params: SignAddCustomMetadataParams
): Promise<{
  addCustomMetadataData: AddCustomMetadataInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signAddCustomMetadata(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      params.key,
      params.value,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    addCustomMetadataData: {
      username: params.username,
      key: params.key,
      value: params.value,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignRemoveCustomMetadataParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  key: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign remove custom metadata from username (dual signature)
 * EXACT pattern from RemoveCustomMetadataComponent.tsx
 */
export async function signRemoveCustomMetadata(
  params: SignRemoveCustomMetadataParams
): Promise<{
  removeCustomMetadataData: RemoveCustomMetadataInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signRemoveCustomMetadata(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      params.key,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    removeCustomMetadataData: {
      username: params.username,
      key: params.key,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignFlushCustomMetadataParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign flush all custom metadata from username (dual signature)
 * EXACT pattern from FlushCustomMetadataComponent.tsx
 */
export async function signFlushCustomMetadata(
  params: SignFlushCustomMetadataParams
): Promise<{
  flushCustomMetadataData: FlushCustomMetadataInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signFlushCustomMetadata(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    flushCustomMetadataData: {
      username: params.username,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

export interface SignFlushUsernameParams {
  evvmID: string | number;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign flush username (dual signature)
 * EXACT pattern from FlushUsernameComponent.tsx
 */
export async function signFlushUsername(
  params: SignFlushUsernameParams
): Promise<{
  flushUsernameData: FlushUsernameInputData;
  payData: PayInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);
  const signatureBuilder = new (NameServiceSignatureBuilder as any)(
    walletClient,
    walletData
  );

  const { paySignature, actionSignature } =
    await signatureBuilder.signFlushUsername(
      BigInt(params.evvmID),
      params.nameServiceAddress,
      params.username,
      BigInt(params.nonceNameService),
      BigInt(params.priorityFee_EVVM),
      BigInt(params.nonceEVVM),
      params.priorityFlag
    );

  return {
    flushUsernameData: {
      username: params.username,
      nonce: BigInt(params.nonceNameService),
      signature: actionSignature,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonceEVVM),
      priorityFlag_EVVM: params.priorityFlag,
      signature_EVVM: paySignature,
    },
    payData: {
      from: walletData.address as `0x${string}`,
      to_address: params.nameServiceAddress,
      to_identity: '',
      token: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      amount: BigInt(0),
      priorityFee: BigInt(params.priorityFee_EVVM),
      nonce: BigInt(params.nonceEVVM),
      priority: params.priorityFlag,
      executor: params.nameServiceAddress,
      signature: paySignature,
    },
  };
}

// ====================================================================================
// P2P SWAP SIGNATURES
// ====================================================================================

export interface SignMakeOrderParams {
  evvmID: string | number;
  p2pSwapAddress: `0x${string}`;
  nonce: string | number;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  amountA: string | number;
  amountB: string | number;
  priorityFee: string | number;
  nonce_EVVM: string | number;
  priority: boolean;
}

/**
 * Sign make order for P2P swap (dual signature)
 * EXACT pattern from MakeOrderComponent.tsx
 */
export async function signMakeOrder(params: SignMakeOrderParams): Promise<{
  makeOrderData: MakeOrderInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);

  // Two signature builders because we need two signatures
  const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );
  const p2pSwapSignatureBuilder = new (P2PSwapSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // Create EVVM pay() signature
  const signatureEVVM = await evvmSignatureBuilder.signPay(
    BigInt(params.evvmID),
    params.p2pSwapAddress,
    params.tokenA,
    BigInt(params.amountA),
    BigInt(params.priorityFee),
    BigInt(params.nonce_EVVM),
    params.priority,
    params.p2pSwapAddress
  );

  // Create P2PSwap makeOrder() signature
  const signatureP2P = await p2pSwapSignatureBuilder.makeOrder(
    BigInt(params.evvmID),
    BigInt(params.nonce),
    params.tokenA,
    params.tokenB,
    BigInt(params.amountA),
    BigInt(params.amountB)
  );

  return {
    makeOrderData: {
      user: walletData.address as `0x${string}`,
      metadata: {
        nonce: BigInt(params.nonce),
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountA: BigInt(params.amountA),
        amountB: BigInt(params.amountB),
      },
      signature: signatureP2P,
      priorityFee: BigInt(params.priorityFee),
      nonce_EVVM: BigInt(params.nonce_EVVM),
      priorityFlag_EVVM: params.priority,
      signature_EVVM: signatureEVVM,
    },
  };
}

export interface SignCancelOrderParams {
  evvmID: string | number;
  p2pSwapAddress: `0x${string}`;
  nonce: string | number;
}

/**
 * Sign cancel order for P2P swap
 * EXACT pattern from CancelOrderComponent.tsx
 */
export async function signCancelOrder(
  params: SignCancelOrderParams
): Promise<{
  cancelOrderData: CancelOrderInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);

  // Two signature builders because we need two signatures
  const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );
  const p2pSwapSignatureBuilder = new (P2PSwapSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // MATE token address
  const MATE_TOKEN_ADDRESS =
    '0x0000000000000000000000000000000000000001' as `0x${string}`;

  // Create EVVM pay() signature with 0 amount
  const signatureEVVM = await evvmSignatureBuilder.signPay(
    BigInt(params.evvmID),
    params.p2pSwapAddress,
    MATE_TOKEN_ADDRESS,
    BigInt(0),
    BigInt(0),
    BigInt(0),
    false,
    params.p2pSwapAddress
  );

  // Create P2PSwap cancelOrder() signature
  const signatureP2P = await p2pSwapSignatureBuilder.cancelOrder(
    BigInt(params.evvmID),
    BigInt(params.nonce)
  );

  return {
    cancelOrderData: {
      user: walletData.address as `0x${string}`,
      nonce: BigInt(params.nonce),
      signature: signatureP2P,
      priorityFee_EVVM: BigInt(0),
      nonce_EVVM: BigInt(0),
      priorityFlag_EVVM: false,
      signature_EVVM: signatureEVVM,
    },
  };
}

/*
 * COMMENTED OUT: These functions use types not exported in current @evvm/viem-signature-library version
 * Uncomment when library is updated to export DispatchOrderFillProportionalFeeInputData and DispatchOrderFillFixedFeeInputData
 */

/*
export interface SignDispatchOrderFillProportionalFeeParams {
  evvmID: string | number;
  p2pSwapAddress: `0x${string}`;
  orderID: string | number;
  userMaker: `0x${string}`;
  nonceMaker: string | number;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  amountA: string | number;
  amountB: string | number;
  priorityFee_EVVM: string | number;
  nonce_EVVM: string | number;
  priorityFlag_EVVM: boolean;
}

// Sign dispatch order fill with proportional fee for P2P swap (dual signature)
// EXACT pattern from DispatchOrderPropotionalComponent.tsx
export async function signDispatchOrderFillProportionalFee(
  params: SignDispatchOrderFillProportionalFeeParams
): Promise<{
  dispatchOrderData: DispatchOrderFillProportionalFeeInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);

  // Two signature builders because we need two signatures
  const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );
  const p2pSwapSignatureBuilder = new (P2PSwapSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // Calculate proportional fee: (amountB * 500) / 10_000 = 5% fee
  const feeAmount = (BigInt(params.amountB) * BigInt(500)) / BigInt(10_000);

  // Create EVVM pay() signature
  const signatureEVVM = await evvmSignatureBuilder.signPay(
    BigInt(params.evvmID),
    params.p2pSwapAddress,
    params.tokenB,
    BigInt(params.amountB) + feeAmount,
    BigInt(params.priorityFee_EVVM),
    BigInt(params.nonce_EVVM),
    params.priorityFlag_EVVM,
    params.p2pSwapAddress
  );

  // Create P2PSwap dispatchOrderFillProportionalFee() signature
  const signatureP2P =
    await p2pSwapSignatureBuilder.dispatchOrderFillProportionalFee(
      BigInt(params.evvmID),
      BigInt(params.orderID),
      params.userMaker,
      BigInt(params.nonceMaker),
      params.tokenA,
      params.tokenB,
      BigInt(params.amountA),
      BigInt(params.amountB)
    );

  return {
    dispatchOrderData: {
      orderID: BigInt(params.orderID),
      userMaker: params.userMaker,
      nonceMaker: BigInt(params.nonceMaker),
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      amountA: BigInt(params.amountA),
      amountB: BigInt(params.amountB),
      signature: signatureP2P,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonce_EVVM),
      priorityFlag_EVVM: params.priorityFlag_EVVM,
      signature_EVVM: signatureEVVM,
    },
  };
}

export interface SignDispatchOrderFillFixedFeeParams {
  evvmID: string | number;
  p2pSwapAddress: `0x${string}`;
  orderID: string | number;
  userMaker: `0x${string}`;
  nonceMaker: string | number;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  amountA: string | number;
  amountB: string | number;
  priorityFee_EVVM: string | number;
  nonce_EVVM: string | number;
  priorityFlag_EVVM: boolean;
}

// Sign dispatch order fill with fixed fee for P2P swap (dual signature)
// EXACT pattern from DispatchOrderFixedComponent.tsx
export async function signDispatchOrderFillFixedFee(
  params: SignDispatchOrderFillFixedFeeParams
): Promise<{
  dispatchOrderData: DispatchOrderFillFixedFeeInputData;
}> {
  const walletData = await getAccountWithRetry(config);
  if (!walletData) {
    throw new Error('Failed to get wallet account');
  }

  const walletClient = await getWalletClient(config);

  // Two signature builders because we need two signatures
  const evvmSignatureBuilder = new (EVVMSignatureBuilder as any)(
    walletClient,
    walletData
  );
  const p2pSwapSignatureBuilder = new (P2PSwapSignatureBuilder as any)(
    walletClient,
    walletData
  );

  // Calculate fixed fee with minimum logic
  const feeCalculation = BigInt(params.amountB) / BigInt(100);
  const feeAmount =
    feeCalculation < BigInt(1) ? BigInt(1) : feeCalculation;

  // Create EVVM pay() signature
  const signatureEVVM = await evvmSignatureBuilder.signPay(
    BigInt(params.evvmID),
    params.p2pSwapAddress,
    params.tokenB,
    BigInt(params.amountB) + feeAmount,
    BigInt(params.priorityFee_EVVM),
    BigInt(params.nonce_EVVM),
    params.priorityFlag_EVVM,
    params.p2pSwapAddress
  );

  // Create P2PSwap dispatchOrderFillFixedFee() signature
  const signatureP2P =
    await p2pSwapSignatureBuilder.dispatchOrderFillFixedFee(
      BigInt(params.evvmID),
      BigInt(params.orderID),
      params.userMaker,
      BigInt(params.nonceMaker),
      params.tokenA,
      params.tokenB,
      BigInt(params.amountA),
      BigInt(params.amountB)
    );

  return {
    dispatchOrderData: {
      orderID: BigInt(params.orderID),
      userMaker: params.userMaker,
      nonceMaker: BigInt(params.nonceMaker),
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      amountA: BigInt(params.amountA),
      amountB: BigInt(params.amountB),
      signature: signatureP2P,
      priorityFee_EVVM: BigInt(params.priorityFee_EVVM),
      nonce_EVVM: BigInt(params.nonce_EVVM),
      priorityFlag_EVVM: params.priorityFlag_EVVM,
      signature_EVVM: signatureEVVM,
    },
  };
}
*/
