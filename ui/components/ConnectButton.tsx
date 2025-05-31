'use client'

import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'

export default function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()

  return (
    <div className="flex items-center gap-4">
      {isConnected && (
        <div className="text-sm text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      )}
      <button
        onClick={() => open()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {isConnected ? 'Account' : 'Connect Wallet'}
      </button>
    </div>
  )
} 