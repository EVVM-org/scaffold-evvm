'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { formatAddress } from '@/lib/evvmConfig';
import styles from '@/styles/components/WalletConnect.module.css';

export function WalletConnect() {
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  const getNetworkName = (id: number | undefined): string => {
    if (!id) return 'Unknown';
    const networks: Record<number, string> = {
      11155111: 'Sepolia',
      421614: 'Arbitrum Sepolia',
      31337: 'Localhost',
    };
    return networks[id] || `Chain ${id}`;
  };

  if (!isConnected || !address) {
    return (
      <div className={styles.container}>
        <button
          onClick={() => open()}
          className={styles.connectButton}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.connected}>
        <div className={styles.info}>
          <div className={styles.address} title={address}>
            {formatAddress(address)}
          </div>
          <div className={styles.network}>{getNetworkName(chain?.id)}</div>
        </div>
        <button onClick={() => disconnect()} className={styles.disconnectButton}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
