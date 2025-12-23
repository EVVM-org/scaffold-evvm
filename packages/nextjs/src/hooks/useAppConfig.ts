import { useEffect, useState } from 'react';

/**
 * Configuration object returned from /api/config
 */
export interface AppConfig {
  evvmAddress: string | null;
  chainId: number | null;
  evvmId: number;
  projectId: string | null;
  stakingAddress: string | null;
  estimatorAddress: string | null;
  nameServiceAddress: string | null;
  treasuryAddress: string | null;
  p2pSwapAddress: string | null;
  rpcUrlLocalhost: string;
  rpcUrlEthSepolia: string;
  rpcUrlArbSepolia: string;
  configVersion: string | null;
  isConfigured: boolean;
}

/**
 * Hook to load application configuration from /api/config
 * 
 * This reads environment variables at runtime, allowing configuration
 * updates without rebuilding the Next.js application.
 * 
 * Usage:
 * ```tsx
 * const { config, loading, error } = useAppConfig();
 * 
 * if (loading) return <div>Loading config...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!config?.isConfigured) return <div>Not configured</div>;
 * 
 * console.log(config.evvmAddress);
 * ```
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/config', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status}`);
        }

        const data = await response.json();
        setConfig(data);

        if (!data.isConfigured) {
          console.warn(
            '⚠️ EVVM not configured. Set NEXT_PUBLIC_EVVM_ADDRESS and NEXT_PUBLIC_CHAIN_ID in .env'
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Failed to load configuration:', message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}
