"use client";

import Hero from "@/components/hero";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Abi } from "viem";
import { sepolia } from "viem/chains";
import { useState } from "react";
import {
  createExtensionWebProofProvider,
  createVlayerClient,
} from "@vlayer/sdk";
import {
  createWebProofRequest,
  startPage,
  expectUrl,
  notarize,
} from "@vlayer/sdk/web_proof";
import webProofVerifier from "../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";
import webProofProver from "../../../contracts/out/WebProofProver.sol/WebProofProver.json";

const verifierAbi = webProofVerifier.abi as Abi;
const proverAbi = webProofProver.abi as Abi;

export default function Profile() {
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofHash, setProofHash] = useState<string | null>(null);

  const { writeContract, isPending: isWritePending } = useWriteContract();

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

  const handleGenerateProof = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const vlayer = createVlayerClient({
        url: process.env.NEXT_PUBLIC_PROVER_URL,
        webProofProvider: createExtensionWebProofProvider({
          notaryUrl: process.env.NEXT_PUBLIC_NOTARY_URL,
          wsProxyUrl: process.env.NEXT_PUBLIC_WS_PROXY_URL,
          token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
        }),
        token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
      });

      const webProofRequest = createWebProofRequest({
        logoUrl: "/logo.png",
        steps: [
          startPage(
            "https://connect.garmin.com/modern/",
            "Go to Garmin Connect login page"
          ),
          expectUrl("https://connect.garmin.com/modern/home", "Log in"),
          notarize(
            "https://connect.garmin.com/userprofile-service/userprofile/settings",
            "GET",
            "Generate Proof of Garmin profile",
            [
              {
                request: {
                  headers: ["Authorization", "Cookie"],
                },
              },
              {
                response: {
                  headers_except: ["Transfer-Encoding"],
                },
              },
            ]
          ),
        ],
      });

      const result = await vlayer.proveWeb({
        address: process.env.NEXT_PUBLIC_PROVER_ADDRESS as `0x${string}`,
        proverAbi: proverAbi as Abi,
        functionName: "main",
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address],
        chainId: sepolia.id,
      });

      console.log(result);

      const result2 = await vlayer.waitForProvingResult({ hash: result });
      console.log(result2);

      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: "verify",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: result2 as any,
        },
        {
          onSuccess: (txHash) => {
            console.log("Transaction successful:", txHash);
            setProofHash(txHash);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            setError(error.message);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setProofHash(null);
  };

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
                  ? 'Re-verify your Garmin profile or update your verification status.'
                  : 'Verify your Garmin profile to unlock features and build trust.'
                }
              </p>
              <div className="card-actions justify-end">
                {isVerified ? (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-outline btn-sm"
                    disabled={!isConnected}
                  >
                    Re-verify Profile
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-success btn-sm"
                    disabled={!isConnected}
                  >
                    Register Now →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Garmin Profile Verification</h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-base-content/70 mb-6">
              <p>Generate a web proof to verify your Garmin profile. This will:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Open Garmin Connect profile page</li>
                <li>Generate a proof of your profile</li>
                <li>Mint an NFT with your verified profile</li>
              </ul>
            </div>

            <button
              onClick={handleGenerateProof}
              disabled={isLoading || !isConnected || isWritePending}
              className={`btn w-full mb-4 ${
                isLoading || !isConnected || isWritePending
                  ? "btn-disabled"
                  : "btn-primary"
              }`}
            >
              {!isConnected
                ? "Connect Wallet to Continue"
                : isLoading
                ? "Generating Proof..."
                : isWritePending
                ? "Waiting for Transaction..."
                : "Generate Proof"}
            </button>

            {error && (
              <div className="alert alert-error mb-4">
                <span className="text-sm">{error}</span>
              </div>
            )}

            {proofHash && (
              <div className="alert alert-success">
                <div>
                  <p className="font-medium text-sm">Proof Generated Successfully!</p>
                  <p className="text-xs mt-1 break-all opacity-70">
                    Transaction Hash: {proofHash}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </>
  );
}
