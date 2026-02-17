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

export interface DebugEntry {
  type: 'request' | 'response' | 'error' | 'info' | 'tx' | 'block' | 'signature' | 'wallet';
  label: string;
  payload: any;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
}
