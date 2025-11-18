'use client';

import React from 'react';
import { useNetworkValidation, getNetworkName } from '@/hooks/useNetworkValidation';
import type { EvvmDeployment } from '@/types/evvm';
import styles from '@/styles/components/NetworkWarning.module.css';

interface NetworkWarningProps {
  deployment: EvvmDeployment | null;
}

export function NetworkWarning({ deployment }: NetworkWarningProps) {
  const {
    isCorrectNetwork,
    walletChainId,
    requiredChainId,
    networkName,
    requiresSwitch,
    switchNetwork,
    isConnected,
  } = useNetworkValidation(deployment);

  // Don't show anything if wallet not connected
  if (!isConnected) {
    return null;
  }

  // Don't show if on correct network
  if (isCorrectNetwork) {
    return null;
  }

  // Show warning if network mismatch
  if (requiresSwitch) {
    return (
      <div className={styles.warningContainer}>
        <div className={styles.warningIcon}>⚠️</div>
        <div className={styles.warningContent}>
          <h3 className={styles.warningTitle}>Wrong Network!</h3>
          <p className={styles.warningMessage}>
            Your wallet is connected to <strong>{getNetworkName(walletChainId!)}</strong>,
            but this EVVM is deployed on <strong>{networkName}</strong>.
          </p>
          <p className={styles.warningHint}>
            You won't be able to interact with the EVVM until you switch networks.
          </p>
        </div>
        <button
          onClick={switchNetwork}
          className={styles.switchButton}
        >
          Switch to {networkName}
        </button>
      </div>
    );
  }

  return null;
}
