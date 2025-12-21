import { cookieStorage, createStorage } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { http } from 'viem'
import {
  sepolia as defaultSepolia,
  arbitrumSepolia as defaultArbitrumSepolia,
} from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// Get projectId from https://cloud.reown.com
export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694' // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Determine environment
const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111')
export const isLocalDev = chainId === 31337

// Localhost/Anvil/Hardhat Network configuration for local development
// Uses CAIP-2 format for chain identification (eip155:31337)
// Reference: https://github.com/wevm/viem/blob/main/src/chains/definitions/anvil.ts
const localhost: AppKitNetwork = {
  id: 31337,
  name: 'Localhost (Anvil/Hardhat)',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545', 'http://127.0.0.1:8545'],
      webSocket: ['ws://localhost:8545', 'ws://127.0.0.1:8545'],
    },
  },
  testnet: true,
  // CAIP-2 chain identifier for proper WalletConnect/AppKit support
  chainNamespace: 'eip155' as const,
}

// Custom Ethereum Sepolia configuration with multiple fast fallback RPCs
// Based on performance testing: Tenderly (0.209s), DRPC (0.259s), Nodies (0.274s)
const sepolia: AppKitNetwork = {
  ...defaultSepolia,
  rpcUrls: {
    default: {
      http: [
        'https://gateway.tenderly.co/public/sepolia',      // Fastest (0.209s)
        'https://sepolia.drpc.org',                         // Fast (0.259s)
        'https://ethereum-sepolia-public.nodies.app',       // Fast (0.274s)
        'https://0xrpc.io/sep',                             // Fast (0.288s)
        'https://rpc.sepolia.ethpandaops.io',               // Official fallback
        'https://ethereum-sepolia.gateway.tatum.io',        // Additional fallback
        'https://1rpc.io/sepolia',                          // Final fallback
      ],
    },
  },
}

// Custom Arbitrum Sepolia configuration with multiple fast fallback RPCs
// Based on performance testing: Tenderly (0.170s), Official (0.217s)
const arbitrumSepolia: AppKitNetwork = {
  ...defaultArbitrumSepolia,
  rpcUrls: {
    default: {
      http: [
        'https://arbitrum-sepolia.gateway.tenderly.co',     // Fastest (0.170s)
        'https://sepolia-rollup.arbitrum.io/rpc',           // Official (0.217s)
        'https://arbitrum-sepolia.drpc.org',                // Fast fallback
        'https://arbitrum-sepolia.api.onfinality.io/public', // Reliable fallback
        'https://api.zan.top/arb-sepolia',                  // Additional fallback
        'https://public.stackup.sh/api/v1/node/arbitrum-sepolia', // Final fallback
      ],
    },
  },
}

// Determine which networks to expose based on environment
// For local development (CHAIN_ID=31337), prioritize localhost
export const networks = isLocalDev
  ? [localhost, sepolia, arbitrumSepolia] as [AppKitNetwork, ...AppKitNetwork[]]
  : [sepolia, arbitrumSepolia, localhost] as [AppKitNetwork, ...AppKitNetwork[]]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [localhost.id]: http('http://localhost:8545', {
      retryCount: 3,
      retryDelay: 500,
    }),
    [sepolia.id]: http(undefined, {
      retryCount: 5,
      retryDelay: 1000,
    }),
    [arbitrumSepolia.id]: http(undefined, {
      retryCount: 5,
      retryDelay: 1000,
    }),
  },
})

export const config = wagmiAdapter.wagmiConfig
