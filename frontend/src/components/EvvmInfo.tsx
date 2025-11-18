'use client';

import { useState } from 'react';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { NetworkBadge } from '@/components/NetworkBadge';
import styles from '@/styles/components/EvvmInfo.module.css';

interface AddressDisplayProps {
  label: string;
  address: string;
  chainId: number;
}

function AddressDisplay({ label, address, chainId }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const shortenAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getExplorerUrl = (addr: string) => {
    // Map common chain IDs to block explorers
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io/address/',
      11155111: 'https://sepolia.etherscan.io/address/',
      421614: 'https://sepolia.arbiscan.io/address/',
      42161: 'https://arbiscan.io/address/',
      31337: '#', // localhost - no explorer
    };

    const baseUrl = explorers[chainId] || '#';
    return baseUrl === '#' ? baseUrl : `${baseUrl}${addr}`;
  };

  return (
    <div className={styles.addressRow}>
      <span className={styles.label}>{label}</span>
      <div className={styles.addressContainer}>
        <span className={styles.address} title={address}>
          {shortenAddress(address)}
        </span>
        <button
          onClick={handleCopy}
          className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
          title="Copy address"
        >
          {copied ? '✓' : '📋'}
        </button>
        {getExplorerUrl(address) !== '#' && (
          <a
            href={getExplorerUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.explorerLink}
            title="View on block explorer"
          >
            🔗
          </a>
        )}
      </div>
    </div>
  );
}

export function EvvmInfo() {
  const { deployment, loading, error } = useEvvmDeployment();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>EVVM Deployment Info</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading deployment information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>EVVM Deployment Info</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>
            <p className={styles.errorIcon}>⚠️</p>
            <p className={styles.errorMessage}>{error}</p>
            <p className={styles.errorHint}>
              Make sure the deployment has been completed and the API is accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>EVVM Deployment Info</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>
            <p className={styles.errorIcon}>📭</p>
            <p className={styles.errorMessage}>No deployment found</p>
            <p className={styles.errorHint}>
              Deploy your EVVM contracts first to see deployment information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>EVVM Deployment Info</h2>
        <NetworkBadge chainId={deployment.chainId} networkName={deployment.networkName} />
      </div>

      <div className={styles.content}>
        {/* Network Information */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Network</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Chain ID:</span>
              <span className={styles.value}>{deployment.chainId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>EVVM ID:</span>
              <span className={styles.value}>{deployment.evvmID}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>EVVM Name:</span>
              <span className={styles.value}>{deployment.evvmName}</span>
            </div>
          </div>
        </div>

        {/* Core Contracts */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Core Contracts</h3>
          <div className={styles.addressList}>
            <AddressDisplay
              label="EVVM"
              address={deployment.evvm}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Registry"
              address={deployment.registry}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Name Service"
              address={deployment.nameService}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Staking"
              address={deployment.staking}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="P2P Swap"
              address={deployment.p2pSwap}
              chainId={deployment.chainId}
            />
          </div>
        </div>

        {/* Utility Contracts */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Utility Contracts</h3>
          <div className={styles.addressList}>
            <AddressDisplay
              label="Treasury"
              address={deployment.treasury}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Estimator"
              address={deployment.estimator}
              chainId={deployment.chainId}
            />
          </div>
        </div>

        {/* Administrative Addresses */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Administrative</h3>
          <div className={styles.addressList}>
            <AddressDisplay
              label="Admin"
              address={deployment.admin}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Golden Fisher"
              address={deployment.goldenFisher}
              chainId={deployment.chainId}
            />
            <AddressDisplay
              label="Activator"
              address={deployment.activator}
              chainId={deployment.chainId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
