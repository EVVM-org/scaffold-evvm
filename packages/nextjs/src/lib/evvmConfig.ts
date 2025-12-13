import type { EvvmDeployment } from '@/types/evvm';
import { loadEvvmConfig } from './evvmConfigStorage';

/**
 * Load EVVM deployments
 * Priority: localStorage config > environment variables
 */
export async function loadDeployments(): Promise<EvvmDeployment[]> {
  try {
    // 1. Check localStorage first
    const storedConfig = loadEvvmConfig();
    if (storedConfig) {
      console.log('📦 Loading deployment from localStorage');
      return [storedConfig];
    }

    // 2. Fallback: Try to read from environment variables and build config
    const evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS;
    const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
    const evvmIDStr = process.env.NEXT_PUBLIC_EVVM_ID;

    if (!evvmAddress || !chainIdStr) {
      throw new Error(
        'No EVVM configuration found. Please configure via /config page or set NEXT_PUBLIC_EVVM_ADDRESS and NEXT_PUBLIC_CHAIN_ID in .env'
      );
    }

    const chainId = parseInt(chainIdStr);
    const networkName = chainId === 11155111 ? 'Ethereum Sepolia' : chainId === 421614 ? 'Arbitrum Sepolia' : 'Unknown';

    console.log('🔧 Loading deployment from environment variables');

    // Return basic deployment from env vars
    // Note: Contract discovery would require async calls, so we provide zero addresses
    // Users should use the /config page for full automatic discovery
    return [
      {
        chainId,
        networkName,
        evvm: evvmAddress as `0x${string}`,
        nameService: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        staking: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        estimator: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        p2pSwap: undefined,
        evvmID: evvmIDStr ? parseInt(evvmIDStr) : 0,
        evvmName: undefined,
        registry: undefined,
        admin: undefined,
        goldenFisher: undefined,
        activator: undefined,
      },
    ];
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
