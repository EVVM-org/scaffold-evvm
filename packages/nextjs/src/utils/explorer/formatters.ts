/**
 * Display formatters for the EVVM explorer: wei/gwei/ether, timestamps,
 * gas usage percentages, and short hashes.
 */

import { formatEther, formatGwei, formatUnits } from 'viem';

export function formatTokenAmount(value: bigint, decimals = 18, precision = 6): string {
  const raw = formatUnits(value, decimals);
  const [intPart, decPart = ''] = raw.split('.');
  if (!decPart) return intPart;
  const trimmed = decPart.slice(0, precision).replace(/0+$/, '');
  return trimmed ? `${intPart}.${trimmed}` : intPart;
}

export function formatEth(value: bigint): string {
  const raw = formatEther(value);
  const num = parseFloat(raw);
  if (num === 0) return '0';
  if (num < 0.000001) return raw;
  return num.toString();
}

export function formatGas(gas: bigint): string {
  return gas.toLocaleString('en-US');
}

export function formatGasPrice(wei: bigint | undefined): string {
  if (!wei) return '0';
  return formatGwei(wei);
}

export function gasUsagePercent(used: bigint, limit: bigint): number {
  if (limit === 0n) return 0;
  return Number((used * 10000n) / limit) / 100;
}

export function relativeTime(timestampSec: bigint | number): string {
  const ts = typeof timestampSec === 'bigint' ? Number(timestampSec) : timestampSec;
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatUtcDate(timestampSec: bigint | number): string {
  const ms = Number(timestampSec) * 1000;
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export function shortHash(hash: string | undefined, left = 10, right = 8): string {
  if (!hash) return '';
  if (hash.length < left + right + 2) return hash;
  return `${hash.slice(0, left)}...${hash.slice(-right)}`;
}

const AMOUNT_NAME_REGEX = /amount|value|fee|reward|quantity|supply/i;
const RAW_ID_NAME_REGEX = /nonce|id$|offerid|locknumber|chainid|evvmid/i;

/**
 * Decide whether a named uint256 argument should be rendered as a token
 * amount (with 18 decimals) rather than a raw integer. IDs and nonces are
 * explicitly excluded so they stay as plain integers.
 */
export function looksLikeTokenAmount(name: string, type: string, value: bigint): boolean {
  if (!type.startsWith('uint')) return false;
  if (RAW_ID_NAME_REGEX.test(name)) return false;
  if (!AMOUNT_NAME_REGEX.test(name)) return false;
  // Only apply human formatting when the magnitude warrants it. Very small
  // values (e.g., a counter named `value`) remain raw.
  return value >= 10n ** 12n;
}

/**
 * Format a bigint amount as "50,000 MATE (50000000000000000000000 wei)" style.
 */
export function formatAmountWithRaw(value: bigint, symbol = 'MATE', decimals = 18): {
  human: string;
  raw: string;
  symbol: string;
} {
  const human = formatTokenAmount(value, decimals);
  const [intPart, decPart] = human.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decPart ? '.' + decPart : '');
  return { human: withCommas, raw: value.toString(), symbol };
}
