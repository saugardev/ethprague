"use client";

import Hero from "@/components/hero";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { Abi } from "viem";
import webProofVerifier from "../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";

const verifierAbi = webProofVerifier.abi as Abi;

export default function Profile() {
  const { address, isConnected } = useAccount();

  const { data: username } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getUsername",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: string | undefined };

  const isVerified = username && username.length > 0;

  return (
    <>
      <Hero 
        title="Your Garmin Profile"
        subtitle="View your verification status and manage your verified identity."
        ctaText="Learn More"
        showCta={false}
      />
      
      <div className="flex mt-10 gap-5 justify-center items-center">
        {/* Left Card - Verification Status */}
        <div className="card bg-base-100 dark w-72 h-80 shadow-sm hover:shadow-lg transition-shadow">
          <div className="card-body flex flex-col justify-center items-center text-center">
            <div className={`mb-4 ${isVerified ? 'text-success' : 'text-warning'}`}>
              {isVerified ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <h3 className="card-title text-2xl mb-2">
              {isVerified ? 'Verified' : 'Unverified'}
            </h3>
            <p className="text-base-content/70">
              {isVerified 
                ? 'Your Garmin profile has been verified and linked to your wallet.' 
                : 'Your profile has not been verified yet. Complete verification to unlock features.'
              }
            </p>
            {!isConnected && (
              <p className="text-sm text-warning mt-2">
                Connect your wallet to view verification status
              </p>
            )}
          </div>
        </div>
        
        {/* Right Side - ID Display and Registration */}
        <div className="flex flex-col gap-5">
          {/* Top Card - ID Display */}
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Profile ID</h3>
              {isVerified ? (
                <div>
                  <p className="text-base-content/70 mb-3">Your verified Garmin username:</p>
                  <div className="bg-base-200 rounded-lg p-3">
                    <code className="text-primary font-mono text-lg">{username}</code>
                  </div>
                </div>
              ) : (
                <p className="text-base-content/70">
                  Complete verification to display your Garmin profile ID.
                </p>
              )}
            </div>
          </div>
          
          {/* Bottom Card - Registration/Action */}
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">
                {isVerified ? 'Manage Profile' : 'Get Verified'}
              </h3>
              <p className="text-base-content/70">
                {isVerified 
                  ? 'View your verification details or update your profile settings.'
                  : 'Verify your Garmin profile to unlock features and build trust.'
                }
              </p>
              <div className="card-actions justify-end">
                {isVerified ? (
                  <div className="btn btn-outline btn-sm">View Details</div>
                ) : (
                  <Link href="/profile/verify" className="btn btn-success btn-sm">
                    Register Now →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
