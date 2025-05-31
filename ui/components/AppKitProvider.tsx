'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { sepolia } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Setup query client
const queryClient = new QueryClient()

// Get projectId from https://cloud.reown.com
const projectId = 'cb29ba11655e3e123025293937f0890e' // Replace with your actual project ID

// Create a metadata object
const metadata = {
  name: 'Your App',
  description: 'Your App Description',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// Set the networks
const networks = [sepolia]

// Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  themeMode: 'light',
  features: {
    analytics: true
  }
})

export default function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 