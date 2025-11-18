export interface EvvmDeployment {
  chainId: number;
  networkName: string;
  evvm: `0x${string}`;
  nameService: `0x${string}`;
  staking: `0x${string}`;
  estimator: `0x${string}`;
  treasury: `0x${string}`;
  p2pSwap?: `0x${string}`;
  evvmID: number;
  evvmName?: string;
  registry?: `0x${string}`;
  admin?: `0x${string}`;
  goldenFisher?: `0x${string}`;
  activator?: `0x${string}`;
}

export interface PayInputData {
  from: `0x${string}`;
  to_address: `0x${string}`;
  to_identity: string;
  token: `0x${string}`;
  amount: bigint;
  priorityFee: bigint;
  nonce: bigint;
  priority: boolean;
  executor: string;
  signature: `0x${string}`;
}

export interface DispersePayRecipient {
  address: `0x${string}`;
  amount: bigint;
}

export interface DispersePayInputData {
  from: `0x${string}`;
  token: `0x${string}`;
  recipients: DispersePayRecipient[];
  priorityFee: bigint;
  nonce: bigint;
  priority: boolean;
  executor: string;
  signature: `0x${string}`;
}

export interface StakingInputData {
  from: `0x${string}`;
  amount: bigint;
  nonce: bigint;
  signature: `0x${string}`;
}

export interface NameServiceInputData {
  from: `0x${string}`;
  username: string;
  nonce: bigint;
  signature: `0x${string}`;
}

export interface DebugEntry {
  type: 'request' | 'response' | 'error' | 'info';
  label: string;
  payload: any;
  timestamp: number;
}
