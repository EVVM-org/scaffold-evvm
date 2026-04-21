/**
 * Classify EVVM function calls into a high-level "Transaction Action" summary
 * and infer token transfers from decoded calldata. EVVM contracts emit no
 * events, so transfers are derived from the function arguments.
 */

import type { DecodedFunction } from './decoder';
import { MATE_TOKEN, ZERO_ADDRESS, type KnownAddress } from './addressBook';

export type TxCategory =
  | 'evvm-pay'
  | 'evvm-disperse'
  | 'staking'
  | 'nameservice'
  | 'p2pswap'
  | 'governance'
  | 'native-transfer'
  | 'contract-call'
  | 'contract-deploy'
  | 'unknown';

export interface TxAction {
  category: TxCategory;
  summary: string;
  methodLabel: string;
}

export interface InferredTransfer {
  kind: 'evvm' | 'erc20';
  token: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  toIdentity?: string;
  amount: bigint;
  note?: string;
}

const STAKING_METHODS = new Set([
  'goldenStaking',
  'presaleStaking',
  'publicStaking',
]);

const NAMESERVICE_METHODS = new Set([
  'preRegistrationUsername',
  'registrationUsername',
  'renewUsername',
  'makeOffer',
  'withdrawOffer',
  'acceptOffer',
  'addCustomMetadata',
  'removeCustomMetadata',
  'flushCustomMetadata',
  'flushUsername',
]);

const P2PSWAP_METHODS = new Set([
  'makeOrder',
  'cancelOrder',
  'dispatchOrder_fillPropotionalFee',
  'dispatchOrder_fillFixedFee',
]);

function methodPretty(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getArg(decoded: DecodedFunction, name: string): unknown {
  return decoded.args.find((a) => a.name === name)?.value;
}

export function classifyTx(
  decoded: DecodedFunction | null,
  from: `0x${string}`,
  to: `0x${string}` | null,
  toKnown: KnownAddress | null,
  value: bigint,
  isContractCreation: boolean,
): TxAction {
  if (isContractCreation) {
    return { category: 'contract-deploy', summary: 'Contract Deployment', methodLabel: 'Deploy' };
  }

  if (!decoded) {
    if (value > 0n) {
      return {
        category: 'native-transfer',
        summary: `Transfer ${value.toString()} wei`,
        methodLabel: 'Transfer',
      };
    }
    return {
      category: 'unknown',
      summary: to ? `Interact with ${toKnown?.name ?? to}` : 'Unknown',
      methodLabel: 'Unknown',
    };
  }

  const fn = decoded.functionName;
  const methodLabel = methodPretty(fn);

  if (decoded.contractKind === 'Core' && fn === 'pay') {
    const toIdentity = getArg(decoded, 'to_identity') as string | undefined;
    const toAddress = getArg(decoded, 'to_address') as string | undefined;
    const target = toIdentity && toIdentity !== '' ? `@${toIdentity}` : toAddress || 'recipient';
    return {
      category: 'evvm-pay',
      summary: `EVVM Pay to ${target}`,
      methodLabel: 'Pay',
    };
  }

  if (decoded.contractKind === 'Core' && fn === 'dispersePay') {
    return {
      category: 'evvm-disperse',
      summary: 'EVVM Disperse Pay (multi-recipient)',
      methodLabel: 'Disperse Pay',
    };
  }

  if (STAKING_METHODS.has(fn)) {
    const isStaking = getArg(decoded, 'isStaking') as boolean | undefined;
    const verb = isStaking === false ? 'Unstake' : 'Stake';
    const kindLabel = fn.replace('Staking', '');
    return {
      category: 'staking',
      summary: `${verb} via ${kindLabel} staking`,
      methodLabel,
    };
  }

  if (NAMESERVICE_METHODS.has(fn)) {
    const username = (getArg(decoded, 'username') || getArg(decoded, 'identity')) as string | undefined;
    const label = username ? `@${username}` : 'NameService action';
    return {
      category: 'nameservice',
      summary: `${methodLabel}: ${label}`,
      methodLabel,
    };
  }

  if (P2PSWAP_METHODS.has(fn)) {
    return {
      category: 'p2pswap',
      summary: `P2P Swap ${methodLabel}`,
      methodLabel,
    };
  }

  // Governance/admin surface on Core
  if (decoded.contractKind === 'Core' && /propose|accept|reject|set|flush|pause|change|upgrade|transfer/i.test(fn)) {
    return {
      category: 'governance',
      summary: `Core ${methodLabel}`,
      methodLabel,
    };
  }

  return {
    category: 'contract-call',
    summary: `${decoded.contractKind}.${fn}()`,
    methodLabel,
  };
}

/**
 * Infer token movements from decoded calldata. Since EVVM emits no events,
 * we surface the intended transfer(s) based on the function semantics.
 */
export function inferTransfers(
  decoded: DecodedFunction | null,
  txFrom: `0x${string}`,
  txTo: `0x${string}` | null,
): InferredTransfer[] {
  if (!decoded) return [];
  const fn = decoded.functionName;

  if (decoded.contractKind === 'Core' && fn === 'pay') {
    const from = (getArg(decoded, 'from') as `0x${string}`) ?? txFrom;
    const toAddress = (getArg(decoded, 'to_address') as `0x${string}`) ?? ZERO_ADDRESS;
    const toIdentity = getArg(decoded, 'to_identity') as string | undefined;
    const token = (getArg(decoded, 'token') as `0x${string}`) ?? MATE_TOKEN;
    const amount = BigInt((getArg(decoded, 'amount') as string | bigint) ?? 0);
    const priorityFee = BigInt((getArg(decoded, 'priorityFee') as string | bigint) ?? 0);
    const transfers: InferredTransfer[] = [];
    if (amount > 0n || (toIdentity && toIdentity !== '')) {
      transfers.push({
        kind: 'evvm',
        token,
        from,
        to: toAddress,
        toIdentity: toIdentity || undefined,
        amount,
        note: 'EVVM internal balance transfer',
      });
    }
    if (priorityFee > 0n && txTo) {
      transfers.push({
        kind: 'evvm',
        token,
        from,
        to: txTo,
        amount: priorityFee,
        note: 'Priority fee to executor',
      });
    }
    return transfers;
  }

  if (decoded.contractKind === 'Core' && fn === 'dispersePay') {
    const from = (getArg(decoded, 'from') as `0x${string}`) ?? txFrom;
    const token = (getArg(decoded, 'token') as `0x${string}`) ?? MATE_TOKEN;
    const toData = getArg(decoded, 'toData') as unknown[] | undefined;
    if (!Array.isArray(toData)) return [];
    return toData.map((entry) => {
      const e = entry as any;
      const amount = BigInt(e?.amount ?? 0);
      const toAddr = (e?.to_address || e?.toAddress || ZERO_ADDRESS) as `0x${string}`;
      const toIdentity = (e?.to_identity || e?.toIdentity) as string | undefined;
      return {
        kind: 'evvm' as const,
        token,
        from,
        to: toAddr,
        toIdentity: toIdentity && toIdentity !== '' ? toIdentity : undefined,
        amount,
        note: 'EVVM disperse recipient',
      };
    });
  }

  return [];
}
