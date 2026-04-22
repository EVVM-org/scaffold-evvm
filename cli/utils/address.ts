/**
 * Address normalization helpers for the CLI.
 *
 * Solidity >= 0.8 rejects hex address literals that aren't EIP-55
 * checksummed. Anywhere the CLI reads an address from a user prompt
 * (or a JSON file a user might have edited) and then writes it into
 * a Solidity source (e.g. input/Inputs.testnet.sol), it must pass
 * through this normalizer first so the generated source compiles.
 */

import { getAddress, isAddress } from 'viem';

/**
 * Validate that a string is a well-formed address (case-insensitive).
 * Accepts all-lowercase, all-uppercase, or mixed-case inputs.
 */
export function isValidAddressShape(value: string): boolean {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Return the EIP-55 checksummed form of an address string. Throws if
 * the input isn't a well-formed address.
 */
export function toChecksum(address: string): `0x${string}` {
  const trimmed = address.trim();
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return getAddress(trimmed);
}

/**
 * Safe variant: returns the checksummed address, or the original
 * input unchanged if it can't be parsed. Useful for display contexts
 * where we don't want to crash on unexpected values.
 */
export function tryChecksum(address: string | undefined | null): string | undefined {
  if (!address) return undefined;
  try {
    return toChecksum(address);
  } catch {
    return address;
  }
}
