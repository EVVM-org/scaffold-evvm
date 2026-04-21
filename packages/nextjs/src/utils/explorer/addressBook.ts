/**
 * Address book for the local EVVM explorer.
 * Resolves known contract addresses (Core, Staking, NameService, etc.) and
 * well-known token addresses (MATE, ETH) to human-readable names.
 */

import type { EvvmDeployment } from '@/types/evvm';

export type KnownAddressKind =
  | 'Core'
  | 'Staking'
  | 'Estimator'
  | 'NameService'
  | 'Treasury'
  | 'P2PSwap'
  | 'Admin'
  | 'GoldenFisher'
  | 'Activator'
  | 'Token'
  | 'ZeroAddress';

export interface KnownAddress {
  address: `0x${string}`;
  name: string;
  kind: KnownAddressKind;
  isContract: boolean;
}

export const MATE_TOKEN = '0x0000000000000000000000000000000000000001' as const;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const STATIC_TOKENS: Record<string, { name: string; symbol: string }> = {
  [ZERO_ADDRESS.toLowerCase()]: { name: 'Ether', symbol: 'ETH' },
  [MATE_TOKEN.toLowerCase()]: { name: 'MATE Token', symbol: 'MATE' },
};

export function buildAddressBook(deployment: EvvmDeployment | null): Record<string, KnownAddress> {
  const book: Record<string, KnownAddress> = {};
  if (!deployment) return book;

  const add = (addr: string | undefined, name: string, kind: KnownAddressKind, isContract: boolean) => {
    if (!addr) return;
    const key = addr.toLowerCase();
    book[key] = { address: addr as `0x${string}`, name, kind, isContract };
  };

  add(deployment.evvm, 'Core', 'Core', true);
  add(deployment.staking, 'Staking', 'Staking', true);
  add(deployment.estimator, 'Estimator', 'Estimator', true);
  add(deployment.nameService, 'NameService', 'NameService', true);
  add(deployment.treasury, 'Treasury', 'Treasury', true);
  add(deployment.p2pSwap, 'P2PSwap', 'P2PSwap', true);

  if (deployment.admin) add(deployment.admin, 'Admin', 'Admin', false);
  if (deployment.goldenFisher) add(deployment.goldenFisher, 'Golden Fisher', 'GoldenFisher', false);
  if (deployment.activator) add(deployment.activator, 'Activator', 'Activator', false);

  return book;
}

export function lookupAddress(
  book: Record<string, KnownAddress>,
  address: string | null | undefined,
): KnownAddress | null {
  if (!address) return null;
  return book[address.toLowerCase()] ?? null;
}

export function resolveToken(address: string | null | undefined): { name: string; symbol: string } | null {
  if (!address) return null;
  return STATIC_TOKENS[address.toLowerCase()] ?? null;
}

export function shortAddress(addr: string | null | undefined, left = 6, right = 4): string {
  if (!addr) return '';
  if (addr.length < left + right + 2) return addr;
  return `${addr.slice(0, 2 + left)}...${addr.slice(-right)}`;
}
