import type { EvvmDeployment } from '@/types/evvm';

/**
 * Load EVVM deployments from the API
 */
export async function loadDeployments(): Promise<EvvmDeployment[]> {
  try {
    const response = await fetch('/api/deployments');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load deployments');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error: any) {
    console.error('Failed to load deployments:', error);
    throw new Error(error.message || 'Failed to load EVVM deployments');
  }
}

/**
 * Get the active deployment for a specific chain
 */
export function getActiveDeployment(
  deployments: EvvmDeployment[],
  chainId: number
): EvvmDeployment | null {
  return deployments.find((d) => d.chainId === chainId) || null;
}

/**
 * Format address for display (shortened)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io/address',
    421614: 'https://sepolia.arbiscan.io/address',
    31337: '', // No explorer for local
  };

  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}/${address}` : '';
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io/tx',
    421614: 'https://sepolia.arbiscan.io/tx',
    31337: '', // No explorer for local
  };

  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}/${txHash}` : '';
}
