/**
 * Token Cache Utility
 *
 * Caches token metadata in localStorage to avoid repeated network calls
 * Provides methods to:
 * - Save token data
 * - Retrieve cached tokens
 * - Clear cache
 * - Get all cached tokens
 */

import type { Address } from 'viem';

export interface CachedToken {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  timestamp: number; // When it was cached
}

const CACHE_KEY = 'evvm_token_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get all cached tokens
 */
export function getAllCachedTokens(): CachedToken[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const tokens: CachedToken[] = JSON.parse(cached);

    // Filter out expired tokens
    const now = Date.now();
    const validTokens = tokens.filter((token) => now - token.timestamp < CACHE_EXPIRY_MS);

    // Update cache if we filtered any
    if (validTokens.length !== tokens.length) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(validTokens));
    }

    return validTokens;
  } catch (error) {
    console.error('Failed to load token cache:', error);
    return [];
  }
}

/**
 * Get cached token by address and chainId
 */
export function getCachedToken(address: Address, chainId: number): CachedToken | null {
  const tokens = getAllCachedTokens();
  const token = tokens.find(
    (t) => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId
  );

  if (!token) return null;

  // Check if expired
  if (Date.now() - token.timestamp > CACHE_EXPIRY_MS) {
    return null;
  }

  return token;
}

/**
 * Save token to cache
 */
export function cacheToken(token: Omit<CachedToken, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const tokens = getAllCachedTokens();

    // Remove existing entry if present
    const filtered = tokens.filter(
      (t) => !(t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId)
    );

    // Add new entry
    const newToken: CachedToken = {
      ...token,
      timestamp: Date.now(),
    };

    filtered.push(newToken);

    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to cache token:', error);
  }
}

/**
 * Remove token from cache
 */
export function removeCachedToken(address: Address, chainId: number): void {
  if (typeof window === 'undefined') return;

  try {
    const tokens = getAllCachedTokens();
    const filtered = tokens.filter(
      (t) => !(t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId)
    );

    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove cached token:', error);
  }
}

/**
 * Clear all cached tokens
 */
export function clearTokenCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear token cache:', error);
  }
}

/**
 * Get cached tokens for specific chainId
 */
export function getCachedTokensByChain(chainId: number): CachedToken[] {
  return getAllCachedTokens().filter((t) => t.chainId === chainId);
}

/**
 * Export cache as JSON (for backup)
 */
export function exportTokenCache(): string {
  const tokens = getAllCachedTokens();
  return JSON.stringify(tokens, null, 2);
}

/**
 * Import cache from JSON (for restore)
 */
export function importTokenCache(jsonString: string): void {
  if (typeof window === 'undefined') return;

  try {
    const tokens: CachedToken[] = JSON.parse(jsonString);

    // Validate structure
    if (!Array.isArray(tokens)) {
      throw new Error('Invalid cache format');
    }

    for (const token of tokens) {
      if (!token.address || !token.name || !token.symbol || token.decimals === undefined) {
        throw new Error('Invalid token structure');
      }
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to import token cache:', error);
    throw error;
  }
}
