'use client'

import { wagmiAdapter, projectId, networks, isLocalDev } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

// Determine the current URL for metadata
// For localhost, use the actual localhost URL to avoid WalletConnect warnings
const getMetadataUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // SSR fallback - use localhost for local dev, production URL otherwise
  return isLocalDev ? 'http://localhost:3000' : 'https://evvm.info'
}

// Set up metadata with dynamic URL
const metadata = {
  name: 'EVVM Scaffold',
  description: 'A complete testing & debugging framework for EVVM virtual blockchains',
  url: getMetadataUrl(),
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal with environment-aware configuration
// For localhost: Only use injected wallets (MetaMask) since WalletConnect requires internet
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  features: {
    // Disable analytics to prevent "Failed to fetch" errors
    analytics: false,
    // Enable email/social login only on production
    email: !isLocalDev,
    socials: isLocalDev ? false : ['google', 'x', 'discord', 'github'],
    // Disable onramp
    onramp: false,
    // Disable swaps
    swaps: false,
  },
  themeVariables: {
    '--w3m-accent': '#000000',
  },
  // Disable default wallet button to avoid duplicates
  enableWalletGuide: false,
  // Allow unsupported chains for local development
  allowUnsupportedChain: isLocalDev,
  // For localhost, only show injected wallets (MetaMask, Brave, etc.)
  featuredWalletIds: isLocalDev ? [] : undefined,
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
