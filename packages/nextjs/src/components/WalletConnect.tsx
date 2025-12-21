'use client';

import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAccount, useChainId, useReconnect } from 'wagmi';
import styles from '@/styles/components/WalletConnect.module.css';
import { useEffect, useState } from 'react';

// Type for ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

// Local chain configuration
const LOCAL_CHAIN = {
  chainId: '0x7a69', // 31337 in hex
  chainName: 'Localhost (Anvil/Hardhat)',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://localhost:8545'],
  blockExplorerUrls: [],
};

export function WalletConnect() {
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount();
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { reconnect } = useReconnect();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const envChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
  const isLocalEnv = envChainId === 31337;

  // Use wagmi's state as primary source of truth
  const address = wagmiAddress || appKitAddress;
  const isConnected = wagmiIsConnected || appKitIsConnected;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for connection state changes and trigger wagmi reconnect
  useEffect(() => {
    if (!mounted) return;

    const handleAccountsChanged = () => {
      // Reconnect wagmi when accounts change
      reconnect();
    };

    const handleConnect = () => {
      reconnect();
    };

    const handleDisconnect = () => {
      setForceUpdate(prev => prev + 1);
    };

    if (window.ethereum) {
      window.ethereum.on?.('connect', handleConnect);
      window.ethereum.on?.('disconnect', handleDisconnect);
      window.ethereum.on?.('accountsChanged', handleAccountsChanged);
      window.ethereum.on?.('chainChanged', handleConnect);

      return () => {
        window.ethereum.removeListener?.('connect', handleConnect);
        window.ethereum.removeListener?.('disconnect', handleDisconnect);
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener?.('chainChanged', handleConnect);
      };
    }
  }, [mounted, reconnect]);

  // Poll for connection changes after modal opens
  useEffect(() => {
    if (!isCheckingConnection || !window.ethereum) return;

    let pollCount = 0;
    const maxPolls = 30; // Poll for up to 3 seconds (30 * 100ms)

    const pollConnection = async () => {
      try {
        const accounts = await (window.ethereum as any).request({
          method: 'eth_accounts',
        });
        
        if (accounts && accounts.length > 0) {
          // Accounts found, trigger wagmi reconnect
          setIsCheckingConnection(false);
          // Force wagmi to reconnect with the newly connected wallet
          setTimeout(() => {
            reconnect();
          }, 100);
          return;
        }

        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(pollConnection, 100);
        } else {
          setIsCheckingConnection(false);
        }
      } catch {
        setIsCheckingConnection(false);
      }
    };

    const timeout = setTimeout(pollConnection, 100);
    return () => clearTimeout(timeout);
  }, [isCheckingConnection, reconnect]);

  const ensureLocalNetworkAndConnect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setStatus('MetaMask not detected. Please install MetaMask.');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    const ethereum = window.ethereum as unknown as EthereumProvider;
    let networkReady = false;

    try {
      // Step 1: Try to add the network to MetaMask
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [LOCAL_CHAIN],
      });
      setStatus('Network added! Opening wallet connection...');
      networkReady = true;
    } catch (error: any) {
      if (error.code === 4001) {
        // User rejected
        setStatus('You rejected the network addition. Please try again.');
        setTimeout(() => setStatus(null), 3000);
        return;
      } else if (error.code === -32602) {
        // Chain already exists, try to switch to it
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: LOCAL_CHAIN.chainId }],
          });
          setStatus('Network ready! Opening wallet connection...');
          networkReady = true;
        } catch (switchError) {
          setStatus('Network ready! Opening wallet connection...');
          networkReady = true;
        }
      } else if (error.message?.includes('already exists')) {
        // Network already added, try to switch
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: LOCAL_CHAIN.chainId }],
          });
          setStatus('Network ready! Opening wallet connection...');
          networkReady = true;
        } catch {
          setStatus('Network ready! Opening wallet connection...');
          networkReady = true;
        }
      } else {
        // Unknown error, but try to proceed anyway
        setStatus('Network ready! Opening wallet connection...');
        networkReady = true;
      }
    }

    // Step 2: Always open the wallet connection modal
    if (networkReady) {
      setTimeout(() => {
        setIsCheckingConnection(true); // Start polling for connection
        open?.();
        setTimeout(() => setStatus(null), 2000);
      }, 300);
    }
  };

  if (!mounted) {
    return null;
  }

  const getNetworkName = (): string => {
    const networks: Record<number, string> = {
      11155111: 'Sepolia',
      421614: 'Arbitrum Sepolia',
      42161: 'Arbitrum One',
      31337: 'Anvil',
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  if (!isConnected || !address) {
    return (
      <div className={styles.container}>
        <button
          onClick={ensureLocalNetworkAndConnect}
          className={styles.connectButton}
          disabled={!!status}
          title={status || 'Connect your wallet'}
        >
          {status ? status : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.connected}>
        <div className={styles.info}>
          <div className={styles.address} title={address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <div className={styles.network}>{getNetworkName()}</div>
        </div>
        <button
          onClick={() => open?.({ view: 'Account' })}
          className={styles.accountButton}
        >
          Account
        </button>
      </div>
    </div>
  );
}
