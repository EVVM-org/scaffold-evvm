'use client';

import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';

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
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: [],
};

export function LocalNetworkHelper() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [status, setStatus] = useState<string | null>(null);

  // Only show on localhost chain or when not connected
  const isLocalChain = chainId === 31337;
  const envChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
  const isLocalEnv = envChainId === 31337;

  // Don't show if not targeting localhost
  if (!isLocalEnv) {
    return null;
  }

  const addNetworkToMetaMask = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setStatus('MetaMask not detected. Please install MetaMask.');
      return;
    }

    const ethereum = window.ethereum as unknown as EthereumProvider;

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [LOCAL_CHAIN],
      });
      setStatus('Network added successfully! Now connect your wallet.');
    } catch (error: any) {
      if (error.code === 4001) {
        setStatus('User rejected the request.');
      } else if (error.code === -32602) {
        // Chain already exists, try to switch to it
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: LOCAL_CHAIN.chainId }],
          });
          setStatus('Switched to localhost network!');
        } catch {
          setStatus('Network already exists. Please switch to it manually.');
        }
      } else {
        setStatus(`Error: ${error.message}`);
      }
    }
  };

  // If connected to local chain, don't show
  if (isConnected && isLocalChain) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)',
      border: '1px solid #ffc107',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#856404', fontSize: '16px' }}>
        🔧 Local Development Setup
      </h4>

      <p style={{ margin: '0 0 16px 0', color: '#856404', fontSize: '14px' }}>
        WalletConnect doesn&apos;t work with localhost. Use MetaMask with these steps:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Step 1: Add Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: '#ffc107',
            color: '#000',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>1</span>
          <button
            onClick={addNetworkToMetaMask}
            style={{
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Add Localhost Network to MetaMask
          </button>
        </div>

        {/* Step 2: Connect */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: '#ffc107',
            color: '#000',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>2</span>
          <span style={{ color: '#856404', fontSize: '14px' }}>
            Click &quot;Connect Wallet&quot; above and select MetaMask
          </span>
        </div>
      </div>

      {status && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: status.includes('Error') || status.includes('rejected')
            ? 'rgba(220, 53, 69, 0.1)'
            : 'rgba(40, 167, 69, 0.1)',
          borderRadius: '6px',
          color: status.includes('Error') || status.includes('rejected') ? '#dc3545' : '#28a745',
          fontSize: '13px',
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
