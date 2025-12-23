'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import styles from '@/styles/Home.module.css';

/**
 * Configuration Diagnostics Component
 * 
 * Displays current application configuration for debugging purposes.
 * Helps verify that .env values are being loaded correctly.
 */
export function ConfigDiagnostics() {
  const { config, loading, error } = useAppConfig();

  if (loading) {
    return (
      <div className={styles.diagnostic}>
        <h3>⚙️ Configuration Status</h3>
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h3>⚠️ Configuration Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={styles.error}>
        <h3>❌ No Configuration</h3>
        <p>Failed to load configuration data</p>
      </div>
    );
  }

  return (
    <details className={styles.diagnostic}>
      <summary>
        <h3>
          {config.isConfigured ? '✅' : '⚠️'} Configuration Status
        </h3>
      </summary>

      <div className={styles.configTable}>
        <div className={styles.configRow}>
          <span className={styles.label}>Status:</span>
          <span className={styles.value}>
            {config.isConfigured ? (
              <span style={{ color: 'green' }}>✅ Configured</span>
            ) : (
              <span style={{ color: 'orange' }}>⚠️ Not Configured</span>
            )}
          </span>
        </div>

        <h4>Core Configuration:</h4>
        <div className={styles.configRow}>
          <span className={styles.label}>EVVM Address:</span>
          <span className={styles.value}>
            {config.evvmAddress || <em>not set</em>}
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>Chain ID:</span>
          <span className={styles.value}>
            {config.chainId !== null ? config.chainId : <em>not set</em>}
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>EVVM ID:</span>
          <span className={styles.value}>{config.evvmId}</span>
        </div>

        <h4>Contract Addresses:</h4>
        <div className={styles.configRow}>
          <span className={styles.label}>Staking:</span>
          <span className={styles.value}>
            {config.stakingAddress || <em>not set</em>}
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>Estimator:</span>
          <span className={styles.value}>
            {config.estimatorAddress || <em>not set</em>}
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>Name Service:</span>
          <span className={styles.value}>
            {config.nameServiceAddress || <em>not set</em>}
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>Treasury:</span>
          <span className={styles.value}>
            {config.treasuryAddress || <em>not set</em>}
          </span>
        </div>

        <h4>RPC URLs:</h4>
        <div className={styles.configRow}>
          <span className={styles.label}>Localhost:</span>
          <span className={styles.value}>{config.rpcUrlLocalhost}</span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>ETH Sepolia:</span>
          <span className={styles.value}>{config.rpcUrlEthSepolia}</span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.label}>ARB Sepolia:</span>
          <span className={styles.value}>{config.rpcUrlArbSepolia}</span>
        </div>
      </div>

      {!config.isConfigured && (
        <div className={styles.warning}>
          <p>
            💡 <strong>Not configured yet?</strong> Set these variables in <code>.env</code>:
          </p>
          <ul>
            <li>
              <code>NEXT_PUBLIC_EVVM_ADDRESS</code> - The deployed EVVM contract address
            </li>
            <li>
              <code>NEXT_PUBLIC_CHAIN_ID</code> - Network chain ID (31337 for localhost)
            </li>
          </ul>
          <p>
            Then run: <code>npm run dev</code>
          </p>
        </div>
      )}
    </details>
  );
}
