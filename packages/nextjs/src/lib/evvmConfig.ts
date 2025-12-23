import type { EvvmDeployment } from '@/types/evvm';
import { loadEvvmConfig, clearEvvmConfig } from './evvmConfigStorage';

/**
 * Check if localStorage config is stale compared to env config
 * Uses NEXT_PUBLIC_CONFIG_VERSION to detect CLI updates
 */
function isConfigStale(storedConfig: any): boolean {
  const envVersion = process.env.NEXT_PUBLIC_CONFIG_VERSION;
  const envAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS;
  const envEvvmId = process.env.NEXT_PUBLIC_EVVM_ID;

  // If env has a config version and it's different from what's stored
  if (envVersion && storedConfig.timestamp) {
    const envVersionNum = parseInt(envVersion);
    // If env version is newer than stored timestamp, config is stale
    if (envVersionNum > storedConfig.timestamp) {
      console.log('🔄 Config version changed, clearing stale localStorage');
      return true;
    }
  }

  // If env address differs from stored, config is stale
  if (envAddress && storedConfig.evvm &&
      envAddress.toLowerCase() !== storedConfig.evvm.toLowerCase()) {
    console.log('🔄 EVVM address changed, clearing stale localStorage');
    return true;
  }

  // If env has EVVM ID but stored doesn't (or they differ), prefer env
  if (envEvvmId && storedConfig.evvmID !== parseInt(envEvvmId)) {
    console.log('🔄 EVVM ID changed, clearing stale localStorage');
    return true;
  }

  return false;
}

/**
 * Load EVVM deployments
 * Priority: localStorage > /api/config > environment variables
 * 
 * The /api/config endpoint allows configuration changes without rebuilding.
 * Environment variables are embedded at build time.
 */
export async function loadDeployments(): Promise<EvvmDeployment[]> {
  try {
    // 1. Check localStorage first
    const storedConfig = loadEvvmConfig();
    if (storedConfig) {
      // Check if the stored config is stale compared to env vars
      if (isConfigStale(storedConfig)) {
        clearEvvmConfig();
        // Fall through to load from env/api
      } else {
        console.log('📦 Loading deployment from localStorage');
        return [storedConfig];
      }
    }

    // 2. Try to load from /api/config (runtime configuration)
    // This allows updating .env without rebuilding
    let evvmAddress: string | undefined;
    let chainIdStr: string | undefined;
    let evvmIDStr: string | undefined;
    let stakingAddress: string | undefined;
    let estimatorAddress: string | undefined;
    let nameServiceAddress: string | undefined;
    let treasuryAddress: string | undefined;
    let p2pSwapAddress: string | undefined;

    try {
      const configResponse = await fetch('/api/config', {
        cache: 'no-store',
      });

      if (configResponse.ok) {
        const apiConfig = await configResponse.json();
        console.log('🔧 Loading deployment from /api/config');

        evvmAddress = apiConfig.evvmAddress;
        chainIdStr = apiConfig.chainId?.toString();
        evvmIDStr = apiConfig.evvmId?.toString();
        stakingAddress = apiConfig.stakingAddress;
        estimatorAddress = apiConfig.estimatorAddress;
        nameServiceAddress = apiConfig.nameServiceAddress;
        treasuryAddress = apiConfig.treasuryAddress;
        p2pSwapAddress = apiConfig.p2pSwapAddress;
      }
    } catch (apiError) {
      console.log('ℹ️ /api/config not available, falling back to env vars');
    }

    // 3. Fallback: Try to read from environment variables (embedded at build time)
    if (!evvmAddress || !chainIdStr) {
      evvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS;
      chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
      evvmIDStr = process.env.NEXT_PUBLIC_EVVM_ID;
      stakingAddress = process.env.NEXT_PUBLIC_STAKING_ADDRESS;
      estimatorAddress = process.env.NEXT_PUBLIC_ESTIMATOR_ADDRESS;
      nameServiceAddress = process.env.NEXT_PUBLIC_NAMESERVICE_ADDRESS;
      treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
      p2pSwapAddress = process.env.NEXT_PUBLIC_P2PSWAP_ADDRESS;
    }

    if (!evvmAddress || !chainIdStr) {
      throw new Error(
        'No EVVM configuration found. Please configure via /config page or set NEXT_PUBLIC_EVVM_ADDRESS and NEXT_PUBLIC_CHAIN_ID in .env'
      );
    }

    const chainId = parseInt(chainIdStr);
    const networkName = chainId === 11155111 ? 'Ethereum Sepolia'
      : chainId === 421614 ? 'Arbitrum Sepolia'
      : chainId === 31337 ? 'Local Chain'
      : 'Unknown';

    console.log('🔧 Loading deployment from environment variables');

    const zeroAddress = '0x0000000000000000000000000000000000000000' as `0x${string}`;

    // Return deployment from env vars
    // Uses CLI-provided addresses if available, falls back to zero address
    return [
      {
        chainId,
        networkName,
        evvm: evvmAddress as `0x${string}`,
        nameService: (nameServiceAddress || zeroAddress) as `0x${string}`,
        staking: (stakingAddress || zeroAddress) as `0x${string}`,
        estimator: (estimatorAddress || zeroAddress) as `0x${string}`,
        treasury: (treasuryAddress || zeroAddress) as `0x${string}`,
        p2pSwap: p2pSwapAddress as `0x${string}` | undefined,
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
