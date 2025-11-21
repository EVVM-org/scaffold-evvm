/**
 * Client-side EVVM Configuration Storage
 *
 * Manages EVVM instance configuration in localStorage
 * Allows switching between different EVVM instances without server restart
 */

export interface StoredEvvmConfig {
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
  timestamp: number; // When config was saved
}

const STORAGE_KEY = 'evvm_config';

/**
 * Save EVVM configuration to localStorage
 */
export function saveEvvmConfig(config: Omit<StoredEvvmConfig, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const configWithTimestamp: StoredEvvmConfig = {
    ...config,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configWithTimestamp));
    console.log('✅ EVVM configuration saved to localStorage');

    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('evvm-config-changed'));
  } catch (error) {
    console.error('❌ Failed to save EVVM configuration:', error);
    throw new Error('Failed to save configuration to localStorage');
  }
}

/**
 * Load EVVM configuration from localStorage
 */
export function loadEvvmConfig(): StoredEvvmConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const config = JSON.parse(stored) as StoredEvvmConfig;
    console.log('📦 Loaded EVVM configuration from localStorage');
    return config;
  } catch (error) {
    console.error('❌ Failed to load EVVM configuration:', error);
    return null;
  }
}

/**
 * Clear/flush EVVM configuration from localStorage
 */
export function clearEvvmConfig(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️  EVVM configuration cleared from localStorage');

    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('evvm-config-changed'));
  } catch (error) {
    console.error('❌ Failed to clear EVVM configuration:', error);
    throw new Error('Failed to clear configuration from localStorage');
  }
}

/**
 * Check if a configuration exists in localStorage
 */
export function hasStoredConfig(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Get configuration age in milliseconds
 */
export function getConfigAge(): number | null {
  const config = loadEvvmConfig();
  if (!config) return null;
  return Date.now() - config.timestamp;
}

/**
 * Format configuration age for display
 */
export function formatConfigAge(age: number): string {
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
