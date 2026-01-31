/**
 * EVVM Signature Constructors
 *
 * This file contains ALL signature building functions for EVVM operations.
 * Uses the official @evvm/evvm-js SDK for signature construction.
 *
 * IMPORTANT: All functions follow the exact patterns from EVVM-Signature-Constructor-Front
 */

import { getWalletClient } from '@wagmi/core';
import { config } from '@/config';
import {
  createSignerWithViem,
  EVVM,
  Staking,
  NameService,
  P2PSwap,
  execute,
  type IPayData,
  type IDispersePayData,
  type IPresaleStakingData,
  type IPublicStakingData,
  type IGoldenStakingData,
  type IPreRegistrationUsernameData,
  type IRegistrationUsernameData,
  type IMakeOfferData,
  type IWithdrawOfferData,
  type IAcceptOfferData,
  type IRenewUsernameData,
  type IAddCustomMetadataData,
  type IRemoveCustomMetadataData,
  type IFlushCustomMetadataData,
  type IFlushUsernameData,
  type IMakeOrderData,
  type ICancelOrderData,
  type ISigner,
  type SignedAction,
} from '@evvm/evvm-js';

// Re-export types for backward compatibility
export type {
  IPayData as PayInputData,
  IDispersePayData as DispersePayInputData,
  IPresaleStakingData as PresaleStakingInputData,
  IPublicStakingData as PublicStakingInputData,
  IGoldenStakingData as GoldenStakingInputData,
  IPreRegistrationUsernameData as PreRegistrationUsernameInputData,
  IRegistrationUsernameData as RegistrationUsernameInputData,
  IMakeOfferData as MakeOfferInputData,
  IWithdrawOfferData as WithdrawOfferInputData,
  IAcceptOfferData as AcceptOfferInputData,
  IRenewUsernameData as RenewUsernameInputData,
  IAddCustomMetadataData as AddCustomMetadataInputData,
  IRemoveCustomMetadataData as RemoveCustomMetadataInputData,
  IFlushCustomMetadataData as FlushCustomMetadataInputData,
  IFlushUsernameData as FlushUsernameInputData,
  IMakeOrderData as MakeOrderInputData,
  ICancelOrderData as CancelOrderInputData,
};

// Re-export SignedAction and execute for components that want to use them directly
export { execute, type SignedAction };

// Helper to get signer and chainId from wagmi wallet client
async function getSignerAndChainId(): Promise<{ signer: ISigner; chainId: number }> {
  const walletClient = await getWalletClient(config);
  if (!walletClient) {
    throw new Error('Failed to get wallet client');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signer = await createSignerWithViem(walletClient as any);
  const chainId = await signer.getChainId();
  return { signer, chainId };
}

// MATE token address constant
const MATE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001' as `0x${string}`;

// ====================================================================================
// PAYMENT SIGNATURES
// ====================================================================================

export interface SignPayParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  to: string; // Address or username
  tokenAddress: `0x${string}`;
  amount: string | number;
  priorityFee: string | number;
  nonce: string | number;
  priority: boolean;
  executor: `0x${string}`;
}

/**
 * Sign a single payment transaction using evvm-js
 */
export async function signPay(params: SignPayParams): Promise<{
  signature: string;
  inputData: IPayData;
  signedAction: SignedAction<IPayData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });

  const isAddress = params.to.startsWith('0x');

  const signedAction = await evvm.pay({
    to: params.to,
    tokenAddress: params.tokenAddress,
    amount: BigInt(params.amount),
    priorityFee: BigInt(params.priorityFee),
    nonce: BigInt(params.nonce),
    priorityFlag: params.priority,
    executor: params.executor,
  });

  // Map to legacy format for backward compatibility
  const inputData: IPayData = {
    ...signedAction.data,
    to_address: isAddress ? (params.to as `0x${string}`) : ('0x0000000000000000000000000000000000000000' as `0x${string}`),
    to_identity: isAddress ? '' : params.to,
  };

  return {
    signature: signedAction.data.signature,
    inputData,
    signedAction,
  };
}

// Backward compatible interface (without evvmAddress)
export interface SignPayParamsLegacy {
  evvmID: string | number;
  to: string;
  tokenAddress: `0x${string}`;
  amount: string | number;
  priorityFee: string | number;
  nonce: string | number;
  priority: boolean;
  executor: `0x${string}`;
}

export interface DispersePayMetadata {
  amount: bigint;
  toAddress: `0x${string}`;
  toIdentity: string;
}

export interface SignDispersePayParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signDispersePay(params: SignDispersePayParams): Promise<{
  signature: string;
  inputData: IDispersePayData;
  signedAction: SignedAction<IDispersePayData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });

  const signedAction = await evvm.dispersePay({
    toData: params.toData.map(item =>
      item.toAddress
        ? { amount: item.amount, toAddress: item.toAddress, toIdentity: undefined as undefined }
        : { amount: item.amount, toAddress: undefined as undefined, toIdentity: item.toIdentity }
    ),
    tokenAddress: params.tokenAddress,
    amount: BigInt(params.totalAmount),
    priorityFee: BigInt(params.priorityFee),
    nonce: BigInt(params.nonce),
    priorityFlag: params.priority,
    executor: params.executor,
  });

  return {
    signature: signedAction.data.signature,
    inputData: signedAction.data,
    signedAction,
  };
}

// ====================================================================================
// STAKING SIGNATURES
// ====================================================================================

export interface SignGoldenStakingParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  stakingAddress: `0x${string}`;
  isStaking: boolean;
  amountOfStaking: number;
  nonce: string | number;
  priority: boolean;
}

/**
 * Sign golden staking transaction using evvm-js
 *
 * CRITICAL: Golden staking ALWAYS uses sync mode (priorityFlag: false)
 */
export async function signGoldenStaking(params: SignGoldenStakingParams): Promise<{
  goldenStakingData: IGoldenStakingData;
  payData: IPayData;
  signedAction: SignedAction<IGoldenStakingData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const staking = new Staking({ signer, address: params.stakingAddress, chainId });

  const amountOfToken = BigInt(params.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

  // Create EVVM pay action first (golden staking always uses sync nonce)
  const evvmAction = await evvm.pay({
    to: params.stakingAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: amountOfToken,
    priorityFee: 0n,
    nonce: BigInt(params.nonce),
    priorityFlag: false, // MUST be false for golden staking
    executor: params.stakingAddress,
  });

  // Create golden staking action
  const stakingAction = await staking.goldenStaking({
    isStaking: params.isStaking,
    amountOfStaking: BigInt(params.amountOfStaking),
    evvmSignedAction: evvmAction,
  });

  return {
    goldenStakingData: stakingAction.data,
    payData: evvmAction.data,
    signedAction: stakingAction,
  };
}

export interface SignPresaleStakingParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  stakingAddress: `0x${string}`;
  isStaking: boolean;
  nonce: string | number;
  priorityFee_EVVM: string | number;
  nonce_EVVM: string | number;
  priorityFlag_EVVM: boolean;
}

/**
 * Sign presale staking transaction (dual signature)
 */
export async function signPresaleStaking(params: SignPresaleStakingParams): Promise<{
  presaleStakingData: IPresaleStakingData;
  payData: IPayData;
  signedAction: SignedAction<IPresaleStakingData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const staking = new Staking({ signer, address: params.stakingAddress, chainId });

  const amountOfToken = BigInt(1) * BigInt(10) ** BigInt(18); // 1 token

  // Create EVVM pay action first
  const evvmAction = await evvm.pay({
    to: params.stakingAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: amountOfToken,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonce_EVVM),
    priorityFlag: params.priorityFlag_EVVM,
    executor: params.stakingAddress,
  });

  // Create presale staking action
  const stakingAction = await staking.presaleStaking({
    isStaking: params.isStaking,
    nonce: BigInt(params.nonce),
    evvmSignedAction: evvmAction,
  });

  return {
    presaleStakingData: stakingAction.data,
    payData: evvmAction.data,
    signedAction: stakingAction,
  };
}

export interface SignPublicStakingParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signPublicStaking(params: SignPublicStakingParams): Promise<{
  publicStakingData: IPublicStakingData;
  payData: IPayData;
  signedAction: SignedAction<IPublicStakingData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const staking = new Staking({ signer, address: params.stakingAddress, chainId });

  const amountOfToken = BigInt(params.amountOfStaking) * (BigInt(5083) * BigInt(10) ** BigInt(18));

  // Create EVVM pay action first
  const evvmAction = await evvm.pay({
    to: params.stakingAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: amountOfToken,
    priorityFee: BigInt(params.priorityFee),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priority,
    executor: params.stakingAddress,
  });

  // Create public staking action
  const stakingAction = await staking.publicStaking({
    isStaking: params.isStaking,
    amountOfStaking: BigInt(params.amountOfStaking),
    nonce: BigInt(params.nonceStaking),
    evvmSignedAction: evvmAction,
  });

  return {
    publicStakingData: stakingAction.data,
    payData: evvmAction.data,
    signedAction: stakingAction,
  };
}

// ====================================================================================
// NAMESERVICE SIGNATURES
// ====================================================================================

export interface SignPreRegistrationUsernameParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signPreRegistrationUsername(
  params: SignPreRegistrationUsernameParams
): Promise<{
  preRegistrationData: IPreRegistrationUsernameData;
  payData: IPayData;
  signedAction: SignedAction<IPreRegistrationUsernameData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount for pre-registration)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonce_EVVM),
    priorityFlag: params.priorityFlag_EVVM,
    executor: params.nameServiceAddress,
  });

  // Hash the username with clow number
  const hashUsername = hashPreRegisteredUsername(params.username, BigInt(params.clowNumber));

  // Create pre-registration action
  const nsAction = await nameService.preRegistrationUsername({
    hashPreRegisteredUsername: hashUsername,
    nonce: BigInt(params.nonce),
    evvmSignedAction: evvmAction,
  });

  return {
    preRegistrationData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

// Hash function for pre-registered username (keccak256)
function hashPreRegisteredUsername(username: string, clowNumber: bigint): string {
  // Use viem's keccak256 for hashing
  const { keccak256, encodePacked } = require('viem');
  const hash = keccak256(encodePacked(['string', 'uint256'], [username, clowNumber]));
  return hash;
}

export interface SignRegistrationUsernameParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signRegistrationUsername(
  params: SignRegistrationUsernameParams
): Promise<{
  registrationData: IRegistrationUsernameData;
  payData: IPayData;
  signedAction: SignedAction<IRegistrationUsernameData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: params.rewardAmount * 100n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create registration action
  const nsAction = await nameService.registrationUsername({
    username: params.username,
    clowNumber: BigInt(params.clowNumber),
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    registrationData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignMakeOfferParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signMakeOffer(params: SignMakeOfferParams): Promise<{
  makeOfferData: IMakeOfferData;
  payData: IPayData;
  signedAction: SignedAction<IMakeOfferData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: BigInt(params.amount),
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create make offer action
  const nsAction = await nameService.makeOffer({
    username: params.username,
    expireDate: BigInt(params.expireDate),
    amount: BigInt(params.amount),
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    makeOfferData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignWithdrawOfferParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  offerID: string | number;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign withdraw offer for username (dual signature)
 */
export async function signWithdrawOffer(
  params: SignWithdrawOfferParams
): Promise<{
  withdrawOfferData: IWithdrawOfferData;
  payData: IPayData;
  signedAction: SignedAction<IWithdrawOfferData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create withdraw offer action
  const nsAction = await nameService.withdrawOffer({
    username: params.username,
    offerID: BigInt(params.offerID),
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    withdrawOfferData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignAcceptOfferParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  offerID: string | number;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign accept offer for username (dual signature)
 */
export async function signAcceptOffer(params: SignAcceptOfferParams): Promise<{
  acceptOfferData: IAcceptOfferData;
  payData: IPayData;
  signedAction: SignedAction<IAcceptOfferData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create accept offer action
  const nsAction = await nameService.acceptOffer({
    username: params.username,
    offerID: BigInt(params.offerID),
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    acceptOfferData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignRenewUsernameParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign renew username (dual signature)
 */
export async function signRenewUsername(
  params: SignRenewUsernameParams
): Promise<{
  renewUsernameData: IRenewUsernameData;
  payData: IPayData;
  signedAction: SignedAction<IRenewUsernameData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create renew username action
  const nsAction = await nameService.renewUsername({
    username: params.username,
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    renewUsernameData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignAddCustomMetadataParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signAddCustomMetadata(
  params: SignAddCustomMetadataParams
): Promise<{
  addCustomMetadataData: IAddCustomMetadataData;
  payData: IPayData;
  signedAction: SignedAction<IAddCustomMetadataData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create add custom metadata action
  const nsAction = await nameService.addCustomMetadata({
    identity: params.username,
    value: params.value,
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    addCustomMetadataData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignRemoveCustomMetadataParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  key: string | number;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign remove custom metadata from username (dual signature)
 */
export async function signRemoveCustomMetadata(
  params: SignRemoveCustomMetadataParams
): Promise<{
  removeCustomMetadataData: IRemoveCustomMetadataData;
  payData: IPayData;
  signedAction: SignedAction<IRemoveCustomMetadataData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create remove custom metadata action
  const nsAction = await nameService.removeCustomMetadata({
    identity: params.username,
    key: BigInt(params.key),
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    removeCustomMetadataData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignFlushCustomMetadataParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign flush all custom metadata from username (dual signature)
 */
export async function signFlushCustomMetadata(
  params: SignFlushCustomMetadataParams
): Promise<{
  flushCustomMetadataData: IFlushCustomMetadataData;
  payData: IPayData;
  signedAction: SignedAction<IFlushCustomMetadataData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create flush custom metadata action
  const nsAction = await nameService.flushCustomMetadata({
    identity: params.username,
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    flushCustomMetadataData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

export interface SignFlushUsernameParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  nameServiceAddress: `0x${string}`;
  username: string;
  nonceNameService: string | number;
  priorityFee_EVVM: string | number;
  nonceEVVM: string | number;
  priorityFlag: boolean;
}

/**
 * Sign flush username (dual signature)
 */
export async function signFlushUsername(
  params: SignFlushUsernameParams
): Promise<{
  flushUsernameData: IFlushUsernameData;
  payData: IPayData;
  signedAction: SignedAction<IFlushUsernameData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const nameService = new NameService({ signer, address: params.nameServiceAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.nameServiceAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: BigInt(params.priorityFee_EVVM),
    nonce: BigInt(params.nonceEVVM),
    priorityFlag: params.priorityFlag,
    executor: params.nameServiceAddress,
  });

  // Create flush username action
  const nsAction = await nameService.flushUsername({
    username: params.username,
    nonce: BigInt(params.nonceNameService),
    evvmSignedAction: evvmAction,
  });

  return {
    flushUsernameData: nsAction.data,
    payData: evvmAction.data,
    signedAction: nsAction,
  };
}

// ====================================================================================
// P2P SWAP SIGNATURES
// ====================================================================================

export interface SignMakeOrderParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
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
 */
export async function signMakeOrder(params: SignMakeOrderParams): Promise<{
  makeOrderData: IMakeOrderData;
  signedAction: SignedAction<IMakeOrderData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const p2pSwap = new P2PSwap({ signer, address: params.p2pSwapAddress, chainId });

  // Create EVVM pay action first
  const evvmAction = await evvm.pay({
    to: params.p2pSwapAddress,
    tokenAddress: params.tokenA,
    amount: BigInt(params.amountA),
    priorityFee: BigInt(params.priorityFee),
    nonce: BigInt(params.nonce_EVVM),
    priorityFlag: params.priority,
    executor: params.p2pSwapAddress,
  });

  // Create make order action
  const p2pAction = await p2pSwap.makeOrder({
    nonce: BigInt(params.nonce),
    tokenA: params.tokenA,
    tokenB: params.tokenB,
    amountA: BigInt(params.amountA),
    amountB: BigInt(params.amountB),
    evvmSignedAction: evvmAction,
  });

  return {
    makeOrderData: p2pAction.data,
    signedAction: p2pAction,
  };
}

export interface SignCancelOrderParams {
  evvmID: string | number;
  evvmAddress: `0x${string}`;
  p2pSwapAddress: `0x${string}`;
  nonce: string | number;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  orderId: string | number;
}

/**
 * Sign cancel order for P2P swap
 */
export async function signCancelOrder(
  params: SignCancelOrderParams
): Promise<{
  cancelOrderData: ICancelOrderData;
  signedAction: SignedAction<ICancelOrderData>;
}> {
  const { signer, chainId } = await getSignerAndChainId();
  const evvm = new EVVM({ signer, address: params.evvmAddress, chainId });
  const p2pSwap = new P2PSwap({ signer, address: params.p2pSwapAddress, chainId });

  // Create EVVM pay action first (0 amount)
  const evvmAction = await evvm.pay({
    to: params.p2pSwapAddress,
    tokenAddress: MATE_TOKEN_ADDRESS,
    amount: 0n,
    priorityFee: 0n,
    nonce: 0n,
    priorityFlag: false,
    executor: params.p2pSwapAddress,
  });

  // Create cancel order action
  const p2pAction = await p2pSwap.cancelOrder({
    nonce: BigInt(params.nonce),
    tokenA: params.tokenA,
    tokenB: params.tokenB,
    orderId: BigInt(params.orderId),
    evvmSignedAction: evvmAction,
  });

  return {
    cancelOrderData: p2pAction.data,
    signedAction: p2pAction,
  };
}

// ====================================================================================
// UTILITY EXPORTS
// ====================================================================================

// Export the hash function for pre-registration
export { hashPreRegisteredUsername };
