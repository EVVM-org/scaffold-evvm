import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import {  sepolia, arbitrumSepolia, localhost } from 'viem/chains';

// Supported chains
export const supportedChains: Record<number, Chain> = {
  11155111: sepolia,
  421614: arbitrumSepolia,
  31337: localhost,
};

// RPC URLs
const RPC_URLS: Record<number, string> = {
  11155111: process.env.NEXT_PUBLIC_RPC_URL_ETH_SEPOLIA || 'https://0xrpc.io/sep',
  421614: process.env.NEXT_PUBLIC_RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc',
  31337: 'http://localhost:8545',
};

/**
 * Get a public client for reading blockchain data
 */
export function getPublicClient(chainId: number): PublicClient {
  const chain = supportedChains[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(RPC_URLS[chainId]),
  });
}

/**
 * Get a wallet client for signing and sending transactions
 * Uses window.ethereum (MetaMask, etc.)
 */
export function getWalletClient(chainId: number): WalletClient | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const chain = supportedChains[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createWalletClient({
    chain,
    transport: custom(window.ethereum),
  });
}

/**
 * Request wallet connection
 */
export async function requestAccounts(): Promise<`0x${string}`[]> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as `0x${string}`[];

  return accounts;
}

/**
 * Switch to a specific chain
 */
export async function switchChain(chainId: number): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum wallet detected');
  }

  const hexChainId = `0x${chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error: any) {
    // Chain not added to wallet, try adding it
    if (error.code === 4902) {
      const chain = supportedChains[chainId];
      if (!chain) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexChainId,
          chainName: chain.name,
          rpcUrls: [RPC_URLS[chainId]],
          nativeCurrency: chain.nativeCurrency,
          blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : undefined,
        }],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Get current chain ID from wallet
 */
export async function getCurrentChainId(): Promise<number> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum wallet detected');
  }

  const chainIdHex = await window.ethereum.request({
    method: 'eth_chainId',
  }) as string;

  return parseInt(chainIdHex, 16);
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
