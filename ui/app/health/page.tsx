"use client";

import Hero from "@/components/hero";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Abi } from "viem";
import { sepolia } from "viem/chains";
import { useState, useEffect } from "react";
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

export default function Health() {
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Profile verification states
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileProofHash, setProfileProofHash] = useState<string | null>(null);
  const [profileTxHash, setProfileTxHash] = useState<`0x${string}` | null>(null);
  
  // Stress level verification states
  const [isStressLoading, setIsStressLoading] = useState(false);
  const [stressError, setStressError] = useState<string | null>(null);
  const [stressProofHash, setStressProofHash] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState("2025-05-29");
  const [userDisplayName, setUserDisplayName] = useState("7b0fccd2-7a54-48e4-9133-6f0e72191f01");

  const { writeContract, isPending: isWritePending } = useWriteContract();

  // Watch for profile verification transaction confirmation
  const { isSuccess: isProfileTxSuccess } = useWaitForTransactionReceipt({
    hash: profileTxHash || undefined,
  });

  const { data: username, refetch: refetchUsername } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getUsername",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: string | undefined; refetch: () => void };

  const isProfileVerified = username && username.length > 0;

  // Auto-populate userDisplayName from username when profile is verified
  useEffect(() => {
    if (isProfileVerified && username) {
      setUserDisplayName(username);
    }
  }, [isProfileVerified, username]);

  // Refetch username when profile verification transaction is confirmed
  useEffect(() => {
    if (isProfileTxSuccess && profileTxHash) {
      refetchUsername();
      setProfileTxHash(null); // Reset after successful refetch
    }
  }, [isProfileTxSuccess, profileTxHash, refetchUsername]);

  const handleGenerateProfileProof = async () => {
    if (!address) {
      setProfileError("Please connect your wallet first");
      return;
    }

    try {
      setIsProfileLoading(true);
      setProfileError(null);

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

      const result2 = await vlayer.waitForProvingResult({ hash: result });

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
            setProfileProofHash(txHash);
            setProfileTxHash(txHash);
          },
          onError: (error) => {
            setProfileError(error.message);
          },
        }
      );
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleGenerateStressProof = async () => {
    if (!address || !username) {
      setStressError("Please verify your profile first");
      return;
    }

    if (!userDisplayName.trim()) {
      setStressError("Please enter your user display name");
      return;
    }

    try {
      setIsStressLoading(true);
      setStressError(null);

      const vlayer = createVlayerClient({
        url: process.env.NEXT_PUBLIC_PROVER_URL,
        webProofProvider: createExtensionWebProofProvider({
          notaryUrl: process.env.NEXT_PUBLIC_NOTARY_URL,
          wsProxyUrl: process.env.NEXT_PUBLIC_WS_PROXY_URL,
          token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
        }),
        token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
      });

      const dailySummaryUrl = `https://connect.garmin.com/usersummary-service/usersummary/daily/${userDisplayName}?calendarDate=${calendarDate}`;
      const dailyUrl = `https://connect.garmin.com/modern/sleep/${calendarDate}/0`;

      const webProofRequest = createWebProofRequest({
        logoUrl: "/logo.png",
        steps: [
          startPage(dailyUrl, "Go to Garmin Connect"),
          expectUrl(dailyUrl, "Getting daily data"),
          notarize(
            dailySummaryUrl,
            "GET",
            `Generate Proof of Daily Average Stress Level for ${calendarDate}`,
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
        functionName: "getDailyAverageStress",
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address, userDisplayName, calendarDate],
        chainId: sepolia.id,
      });

      const result2 = await vlayer.waitForProvingResult({ hash: result });

      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: "verifyDailyAverageStress",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: [...(result2 as any), calendarDate],
        },
        {
          onSuccess: (txHash) => {
            setStressProofHash(txHash);
          },
          onError: (error) => {
            setStressError(error.message);
          },
        }
      );
    } catch (err) {
      setStressError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsStressLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setProfileError(null);
    setProfileProofHash(null);
    setStressError(null);
    setStressProofHash(null);
  };

  return (
    <>
      <Hero 
        title="Verify your health status with data"
        subtitle="Prove you are healthy or document health conditions using verified metrics."
        ctaText="Create Health Proof"
        showCta={true}
      />
      
      <div className="flex mt-10 gap-5 justify-center items-center">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="card image-full dark w-72 h-80 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
        >
          <figure>
            <img
              src="/health-check.jpg"
              alt="Health Verification"
              className="w-full h-full object-cover"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-white">Health Verification</h3>
            <p className="text-white/80">Create verifiable health proofs using sleep, heart rate, fitness age and more.</p>
            <div className="card-actions justify-end">
              <div className="btn btn-success btn-soft">Verify Health →</div>
            </div>
          </div>
        </button>
        
        <div className="mt-auto leading-tight flex flex-col gap-5 relative">
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Wellness Proof</h3>
              <p className="text-base-content/70">Demonstrate optimal health with verified metrics from Grass data.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Create Proof</div>
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Medical Documentation</h3>
              <p className="text-base-content/70">Document health conditions or recovery with timestamped health data.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Document Health</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Verification Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Health Verification</h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            {/* Step 1: Profile Verification */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`badge ${isProfileVerified ? 'badge-success' : 'badge-warning'}`}>
                  {isProfileVerified ? '✓' : '1'}
                </div>
                <h4 className="text-lg font-semibold">
                  {isProfileVerified ? 'Profile Verified' : 'Verify Garmin Profile'}
                </h4>
              </div>

              {isProfileVerified ? (
                <div className="alert alert-success alert-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Profile verified: <code className="text-xs">{username}</code></span>
                </div>
              ) : (
                <>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-warning">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-medium">Profile verification required</span>
                    </div>
                    <p className="text-sm text-warning/80 mt-1">
                      You must verify your Garmin profile before generating health proofs.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateProfileProof}
                    disabled={isProfileLoading || !isConnected || isWritePending}
                    className={`btn btn-sm ${
                      isProfileLoading || !isConnected || isWritePending
                        ? "btn-disabled"
                        : "btn-primary"
                    }`}
                  >
                    {!isConnected
                      ? "Connect Wallet to Continue"
                      : isProfileLoading
                      ? "Verifying Profile..."
                      : isWritePending
                      ? "Waiting for Transaction..."
                      : "Verify Garmin Profile"}
                  </button>

                  {profileError && (
                    <div className="alert alert-error mt-4">
                      <span className="text-sm">{profileError}</span>
                    </div>
                  )}

                  {profileProofHash && (
                    <div className="alert alert-success mt-4">
                      <div>
                        <p className="font-medium text-sm">Profile verified successfully!</p>
                        <p className="text-xs mt-1 break-all opacity-70">
                          Transaction: {profileProofHash}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 2: Stress Level Verification */}
            {isProfileVerified && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`badge ${stressProofHash ? 'badge-success' : 'badge-primary'}`}>
                    {stressProofHash ? '✓' : '2'}
                  </div>
                  <h4 className="text-lg font-semibold">Generate Stress Level Proof</h4>
                </div>

                <p className="text-sm text-base-content/70 mb-4">
                  Create a verifiable proof of your daily average stress level from Garmin data.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">
                      <span className="label-text text-sm">User Display Name (UUID):</span>
                    </label>
                    <input
                      type="text"
                      value={userDisplayName}
                      readOnly
                      className="input input-bordered input-sm w-full bg-base-200"
                    />
                    <label className="label">
                      <span className="label-text-alt text-xs">Auto-populated from your verified profile</span>
                    </label>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text text-sm">Calendar Date:</span>
                    </label>
                    <input
                      type="date"
                      value={calendarDate}
                      onChange={(e) => setCalendarDate(e.target.value)}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateStressProof}
                  disabled={
                    isStressLoading ||
                    !isConnected ||
                    isWritePending ||
                    !userDisplayName.trim()
                  }
                  className={`btn btn-sm w-full ${
                    isStressLoading ||
                    !isConnected ||
                    isWritePending ||
                    !userDisplayName.trim()
                      ? "btn-disabled"
                      : "btn-success"
                  }`}
                >
                  {!isConnected
                    ? "Connect Wallet to Continue"
                    : isStressLoading
                    ? "Generating Stress Level Proof..."
                    : isWritePending
                    ? "Waiting for Transaction..."
                    : `Verify Stress Level for ${calendarDate}`}
                </button>

                {stressError && (
                  <div className="alert alert-error mt-4">
                    <span className="text-sm">{stressError}</span>
                  </div>
                )}

                {stressProofHash && (
                  <div className="alert alert-success mt-4">
                    <div>
                      <p className="font-medium text-sm">Stress Level Proof Generated Successfully!</p>
                      <p className="text-sm mt-1">Date: {calendarDate}</p>
                      <p className="text-xs mt-2 break-all opacity-70">
                        Transaction: {stressProofHash}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completion Status */}
            {stressProofHash && (
              <div className="border-t pt-6 mt-6">
                <div className="text-center">
                  <div className="text-success text-3xl mb-2">🎉</div>
                  <h4 className="text-lg font-bold text-success">Health Verification Complete!</h4>
                  <p className="text-sm text-base-content/70">
                    You have successfully verified your Garmin profile and generated a stress level proof.
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