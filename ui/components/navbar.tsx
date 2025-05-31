'use client'

import Link from "next/link";
import Image from "next/image";
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'

export default function Navbar() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const closeDropdown = () => {
    const elem = document.activeElement as HTMLElement;
    if (elem) {
      elem.blur();
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4 w-full">
      <div className="flex justify-between items-center">
        <div className="w-40">
          <Link href="/" className="flex items-center w-fit">
            <div className="title">Grass</div>
            <Image src="/logo.png" alt="logo" width={28} height={28} />
          </Link>
        </div>
        

        <div className="flex gap-10">
          <Link href="/social" className="btn btn-ghost">Social</Link>
          <Link href="/train" className="btn btn-ghost">Train</Link>
          <Link href="/health" className="btn btn-ghost">Health</Link>
        </div>

        <div className="w-40">
          {isConnected ? (
            /* Dropdown for connected users */
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-success btn-soft w-full justify-between">
                <span>{`${address?.slice(0, 6)}...`}</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-1">
                <li>
                  <Link href="/profile" className="flex items-center gap-2" onClick={closeDropdown}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </Link>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button 
                    className="flex items-center gap-2"
                    onClick={() => {
                      open();
                      closeDropdown();
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Wallet Settings</span>
                  </button>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button 
                    className="flex items-center gap-2 text-error"
                    onClick={() => {
                      disconnect();
                      closeDropdown();
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Disconnect</span>
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            /* Simple button for non-connected users */
            <button 
              onClick={() => open()}
              className="btn btn-success btn-soft w-full"
            >
              Touch Grass
            </button>
          )}
        </div>
      </div>
    </div>
  );
}