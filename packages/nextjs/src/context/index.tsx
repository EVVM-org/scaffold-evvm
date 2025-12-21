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

// Create the modal with full configuration including localhost support
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  features: {
    // Disable analytics to prevent "Failed to fetch" errors
    analytics: false,
    // Email/social login only on production
    email: !isLocalDev,
    socials: isLocalDev ? false : ['google', 'x', 'discord', 'github'],
    // Disable onramp and swaps
    onramp: false,
    swaps: false,
  },
  themeVariables: {
    '--w3m-accent': '#000000',
  },
  // Enable wallet guide for better UX
  enableWalletGuide: true,
  // Allow unsupported chains for local development
  allowUnsupportedChain: true,
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
