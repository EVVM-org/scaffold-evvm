/**
 * Function and event decoder for the EVVM explorer.
 * Maps contract addresses → ABI, decodes calldata and logs with viem.
 */

import { decodeFunctionData, decodeEventLog, type Abi, type Hex, type Log } from 'viem';
import {
  CoreABI,
  StakingABI,
  NameServiceABI,
  P2PSwapABI,
  EstimatorABI,
} from '@evvm/evvm-js';
import type { EvvmDeployment } from '@/types/evvm';
import type { ServicesRegistry } from '@/types/services';

export type ContractKind =
  | 'Core'
  | 'Staking'
  | 'Estimator'
  | 'NameService'
  | 'P2PSwap'
  | 'CustomService'
  | 'Unknown';

export interface AbiEntry {
  kind: ContractKind;
  abi: Abi;
  /** For CustomService entries: the service's human-readable name (used
   *  in the explorer UI to label the source of a decoded event/tx). */
  label?: string;
}

export interface AddressAbiMap {
  byAddress: Record<string, AbiEntry>;
  allAbis: Abi[];
}

export function buildAbiMap(
  deployment: EvvmDeployment | null,
  registry?: ServicesRegistry | null,
): AddressAbiMap {
  const byAddress: AddressAbiMap['byAddress'] = {};
  const addAbi = (
    addr: string | undefined,
    kind: ContractKind,
    abi: Abi,
    label?: string,
  ) => {
    if (!addr) return;
    byAddress[addr.toLowerCase()] = { kind, abi, label };
  };
  if (deployment) {
    addAbi(deployment.evvm, 'Core', CoreABI as Abi);
    addAbi(deployment.staking, 'Staking', StakingABI as Abi);
    addAbi(deployment.estimator, 'Estimator', EstimatorABI as Abi);
    addAbi(deployment.nameService, 'NameService', NameServiceABI as Abi);
    addAbi(deployment.p2pSwap, 'P2PSwap', P2PSwapABI as Abi);
  }
  if (registry) {
    for (const svc of Object.values(registry.services)) {
      addAbi(svc.address, 'CustomService', svc.abi as unknown as Abi, svc.name);
    }
  }
  const allAbis: Abi[] = [
    CoreABI as Abi,
    StakingABI as Abi,
    NameServiceABI as Abi,
    P2PSwapABI as Abi,
    EstimatorABI as Abi,
  ];
  return { byAddress, allAbis };
}

export interface DecodedFunction {
  functionName: string;
  contractKind: ContractKind;
  args: { name: string; type: string; value: unknown }[];
}

export function decodeTxInput(
  toAddress: string | null | undefined,
  input: string | undefined,
  map: AddressAbiMap,
): DecodedFunction | null {
  if (!input || input === '0x' || input.length < 10) return null;
  const entry = toAddress ? map.byAddress[toAddress.toLowerCase()] : undefined;
  if (!entry) return null;
  try {
    const decoded = decodeFunctionData({ abi: entry.abi, data: input as Hex });
    const fnAbi = (entry.abi as any[]).find(
      (i: any) => i.type === 'function' && i.name === decoded.functionName,
    );
    const args: DecodedFunction['args'] = [];
    if (fnAbi?.inputs && decoded.args) {
      for (let i = 0; i < fnAbi.inputs.length; i++) {
        args.push({
          name: fnAbi.inputs[i].name || `arg${i}`,
          type: fnAbi.inputs[i].type || 'unknown',
          value: (decoded.args as unknown[])[i],
        });
      }
    }
    return {
      functionName: decoded.functionName,
      contractKind: entry.kind,
      args,
    };
  } catch {
    return null;
  }
}

export interface DecodedLog {
  address: `0x${string}`;
  source: ContractKind | 'ERC-20' | 'Unknown';
  eventName?: string;
  args?: Record<string, unknown>;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
}

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

function coerceArgs(args: unknown): Record<string, unknown> | undefined {
  if (!args) return undefined;
  if (Array.isArray(args)) {
    const out: Record<string, unknown> = {};
    (args as unknown[]).forEach((v, i) => {
      out[i.toString()] = v;
    });
    return out;
  }
  if (typeof args === 'object') return args as Record<string, unknown>;
  return undefined;
}

const ERC20_MINIMAL_ABI: Abi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'address', name: 'to', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { type: 'address', name: 'owner', indexed: true },
      { type: 'address', name: 'spender', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  },
];

export function decodeLog(log: Log, map: AddressAbiMap): DecodedLog {
  const address = log.address as `0x${string}`;
  const known = map.byAddress[address.toLowerCase()];
  const topic0 = log.topics?.[0];

  if (known) {
    try {
      const decoded = decodeEventLog({
        abi: known.abi,
        topics: log.topics as any,
        data: log.data,
      });
      return {
        address,
        source: known.kind,
        eventName: decoded.eventName,
        args: coerceArgs(decoded.args),
        topics: log.topics as readonly `0x${string}`[],
        data: log.data,
      };
    } catch {
      // fall through
    }
  }

  if (topic0 === ERC20_TRANSFER_TOPIC || topic0 === ERC20_APPROVAL_TOPIC) {
    try {
      const decoded = decodeEventLog({
        abi: ERC20_MINIMAL_ABI,
        topics: log.topics as any,
        data: log.data,
      });
      return {
        address,
        source: 'ERC-20',
        eventName: decoded.eventName,
        args: coerceArgs(decoded.args),
        topics: log.topics as readonly `0x${string}`[],
        data: log.data,
      };
    } catch {
      // fall through
    }
  }

  return {
    address,
    source: 'Unknown',
    topics: log.topics as readonly `0x${string}`[],
    data: log.data,
  };
}
