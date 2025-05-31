"use client";

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
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { Abi } from "viem";
import { sepolia } from "viem/chains";
import webProofVerifier from "../../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";
import webProofProver from "../../../../contracts/out/WebProofProver.sol/WebProofProver.json";

// Prover contract ABI
const proverAbi = webProofProver.abi as Abi;

const verifierAbi = webProofVerifier.abi as Abi;

export default function WebProofPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofHash, setProofHash] = useState<string | null>(null);
  const { address, isConnected } = useAccount();

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
        logoUrl: "/logo.png", // Make sure to add your logo
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
                  headers: ["Authorization", "Cookie"], // Redact sensitive headers
                },
              },
              {
                response: {
                  // response from api.x.com sometimes comes with Transfer-Encoding: Chunked
                  // which needs to be recognised by Prover and cannot be redacted
                  headers_except: ["Transfer-Encoding"],
                },
              },
            ]
          ),
        ],
      });

      const result = await vlayer.proveWeb({
        address: process.env.NEXT_PUBLIC_PROVER_ADDRESS as `0x${string}`, // Replace with your deployed WebProofProver contract address
        proverAbi: proverAbi as Abi,
        functionName: "main",
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address],
        chainId: sepolia.id, // Sepolia chain ID
      });

      console.log(result);

      const result2 = await vlayer.waitForProvingResult({ hash: result });
      console.log(result2);

      // Use wagmi's writeContract to prompt user to sign the transaction
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

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Garmin Profile Verification
          </h1>
        </div>

        <div className="text-gray-600 mb-6">
          <p>Generate a web proof to verify your Garmin profile. This will:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Open Garmin Connect profile page</li>
            <li>Generate a proof of your profile</li>
            <li>Mint an NFT with your verified profile</li>
          </ul>
        </div>

        {username && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md">
            <p className="font-medium">
              Current verified username: {String(username)}
            </p>
          </div>
        )}

        <button
          onClick={handleGenerateProof}
          disabled={isLoading || !isConnected || isWritePending}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${
              isLoading || !isConnected || isWritePending
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
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
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {proofHash && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="font-medium">Proof Generated Successfully!</p>
            <p className="mt-2 text-sm break-all">
              Transaction Hash: {proofHash}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}