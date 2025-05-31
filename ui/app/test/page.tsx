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
import webProofVerifier from "../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";
import webProofProver from "../../../contracts/out/WebProofProver.sol/WebProofProver.json";

// Prover contract ABI
const proverAbi = webProofProver.abi as Abi;

const verifierAbi = webProofVerifier.abi as Abi;

// Fitness metrics options
const fitnessMetrics = [
  {
    key: "countOfActivities",
    label: "Count of Activities",
    proverFunction: "getCountOfActivities",
    verifierFunction: "verifyCountOfActivities",
  },
  {
    key: "totalDuration",
    label: "Total Duration (ms)",
    proverFunction: "getTotalDuration",
    verifierFunction: "verifyTotalDuration",
  },
  {
    key: "totalDistance",
    label: "Total Distance (m)",
    proverFunction: "getTotalDistance",
    verifierFunction: "verifyTotalDistance",
  },
  {
    key: "maxDistance",
    label: "Max Distance (m)",
    proverFunction: "getMaxDistance",
    verifierFunction: "verifyMaxDistance",
  },
  {
    key: "totalCalories",
    label: "Total Calories",
    proverFunction: "getTotalCalories",
    verifierFunction: "verifyTotalCalories",
  },
  {
    key: "totalElevationGain",
    label: "Total Elevation Gain (cm)",
    proverFunction: "getTotalElevationGain",
    verifierFunction: "verifyTotalElevationGain",
  },
  {
    key: "totalSteps",
    label: "Total Steps",
    proverFunction: "getTotalSteps",
    verifierFunction: "verifyTotalSteps",
  },
  {
    key: "avgHeartRate",
    label: "Average Heart Rate (bpm)",
    proverFunction: "getAvgHeartRate",
    verifierFunction: "verifyAvgHeartRate",
  },
  {
    key: "maxHeartRate",
    label: "Max Heart Rate (bpm)",
    proverFunction: "getMaxHeartRate",
    verifierFunction: "verifyMaxHeartRate",
  },
];

// Daily summary metrics options
const dailySummaryMetrics = [
  {
    key: "dailySteps",
    label: "Daily Steps",
    proverFunction: "getDailySteps",
    verifierFunction: "verifyDailySteps",
  },
  {
    key: "dailyAverageStress",
    label: "Daily Average Stress Level",
    proverFunction: "getDailyAverageStress",
    verifierFunction: "verifyDailyAverageStress",
  },
  {
    key: "dailyDistance",
    label: "Daily Distance (meters)",
    proverFunction: "getDailyDistance",
    verifierFunction: "verifyDailyDistance",
  },
  {
    key: "dailyRestingHeartRate",
    label: "Daily Resting Heart Rate",
    proverFunction: "getDailyRestingHeartRate",
    verifierFunction: "verifyDailyRestingHeartRate",
  },
];

export default function WebProofPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState(fitnessMetrics[0]);
  const [endDate, setEndDate] = useState("2025-05-31");
  const [isFitnessLoading, setIsFitnessLoading] = useState(false);
  const [fitnessError, setFitnessError] = useState<string | null>(null);
  const [fitnessProofHash, setFitnessProofHash] = useState<string | null>(null);

  // Daily summary states
  const [selectedDailyMetric, setSelectedDailyMetric] = useState(
    dailySummaryMetrics[0]
  );
  const [calendarDate, setCalendarDate] = useState("2025-05-29");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(false);
  const [dailySummaryError, setDailySummaryError] = useState<string | null>(
    null
  );
  const [dailySummaryProofHash, setDailySummaryProofHash] = useState<
    string | null
  >(null);

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

  const { data: userFitnessData } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getUserFitnessDataByAddress",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!username,
    },
  }) as { data: any };

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

  const handleGenerateFitnessProof = async () => {
    if (!address || !username) {
      setFitnessError("Please verify your profile first");
      return;
    }

    try {
      setIsFitnessLoading(true);
      setFitnessError(null);

      const vlayer = createVlayerClient({
        url: process.env.NEXT_PUBLIC_PROVER_URL,
        webProofProvider: createExtensionWebProofProvider({
          notaryUrl: process.env.NEXT_PUBLIC_NOTARY_URL,
          wsProxyUrl: process.env.NEXT_PUBLIC_WS_PROXY_URL,
          token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
        }),
        token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
      });

      const fitnessUrl = `https://connect.garmin.com/fitnessstats-service/activity?aggregation=lifetime&groupByParentActivityType=false&groupByEventType=false&startDate=1970-01-01&endDate=${endDate}&metric=duration&metric=distance&metric=movingDuration&metric=splitSummaries.noOfSplits.CLIMB_ACTIVE&metric=splitSummaries.duration.CLIMB_ACTIVE&metric=splitSummaries.totalAscent.CLIMB_ACTIVE&metric=splitSummaries.maxElevationGain.CLIMB_ACTIVE&metric=splitSummaries.numClimbsAttempted.CLIMB_ACTIVE&metric=splitSummaries.numClimbsCompleted.CLIMB_ACTIVE&metric=splitSummaries.numClimbSends.CLIMB_ACTIVE&metric=splitSummaries.numFalls.CLIMB_ACTIVE&metric=calories&metric=elevationGain&metric=elevationLoss&metric=avgSpeed&metric=maxSpeed&metric=avgGradeAdjustedSpeed&metric=avgHr&metric=maxHr&metric=avgRunCadence&metric=maxRunCadence&metric=avgBikeCadence&metric=maxBikeCadence&metric=avgWheelchairCadence&metric=maxWheelchairCadence&metric=avgPower&metric=maxPower&metric=avgVerticalOscillation&metric=avgGroundContactTime&metric=avgStrideLength&metric=avgStress&metric=maxStress&metric=splitSummaries.duration.CLIMB_REST&metric=beginPackWeight&metric=steps&standardizedUnits=false`;

      const webProofRequest = createWebProofRequest({
        logoUrl: "/logo.png",
        steps: [
          startPage(
            "https://connect.garmin.com/modern/",
            "Go to Garmin Connect"
          ),
          expectUrl(
            "https://connect.garmin.com/modern/home",
            "Log in to Garmin"
          ),
          expectUrl(
            "https://connect.garmin.com/modern/progress-summary",
            "Go to Progress Summary"
          ),
          notarize(
            fitnessUrl,
            "GET",
            `Generate Proof of ${selectedMetric.label}`,
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
        functionName: selectedMetric.proverFunction,
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address, endDate],
        chainId: sepolia.id,
      });

      console.log("Fitness proof result:", result);

      const result2 = await vlayer.waitForProvingResult({ hash: result });
      console.log("Fitness proof result2:", result2);

      // Use wagmi's writeContract to verify the fitness data
      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: selectedMetric.verifierFunction,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: result2 as any,
        },
        {
          onSuccess: (txHash) => {
            console.log("Fitness verification successful:", txHash);
            setFitnessProofHash(txHash);
          },
          onError: (error) => {
            console.error("Fitness verification failed:", error);
            setFitnessError(error.message);
          },
        }
      );
    } catch (err) {
      setFitnessError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsFitnessLoading(false);
    }
  };

  const handleGenerateDailySummaryProof = async () => {
    if (!address || !username) {
      setDailySummaryError("Please verify your profile first");
      return;
    }

    if (!userDisplayName.trim()) {
      setDailySummaryError("Please enter your user display name");
      return;
    }

    try {
      setIsDailySummaryLoading(true);
      setDailySummaryError(null);

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
            `Generate Proof of ${selectedDailyMetric.label} for ${calendarDate}`,
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
        functionName: selectedDailyMetric.proverFunction,
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address, userDisplayName, calendarDate],
        chainId: sepolia.id,
      });

      console.log("Daily summary proof result:", result);

      const result2 = await vlayer.waitForProvingResult({ hash: result });
      console.log("Daily summary proof result2:", result2);

      // Use wagmi's writeContract to verify the daily summary data
      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: selectedDailyMetric.verifierFunction,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: [...(result2 as any), calendarDate],
        },
        {
          onSuccess: (txHash) => {
            console.log("Daily summary verification successful:", txHash);
            setDailySummaryProofHash(txHash);
          },
          onError: (error) => {
            console.error("Daily summary verification failed:", error);
            setDailySummaryError(error.message);
          },
        }
      );
    } catch (err) {
      setDailySummaryError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setIsDailySummaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Verification Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Garmin Profile Verification
            </h1>
          </div>

          <div className="text-gray-600 mb-6">
            <p>
              Generate a web proof to verify your Garmin profile. This will:
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>Open Garmin Connect profile page</li>
              <li>Generate a proof of your profile</li>
              <li>Verify your username on-chain</li>
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
              : "Generate Profile Proof"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {proofHash && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
              <p className="font-medium">
                Profile Proof Generated Successfully!
              </p>
              <p className="mt-2 text-sm break-all">
                Transaction Hash: {proofHash}
              </p>
            </div>
          )}
        </div>

        {/* Fitness Data Verification Section */}
        {username && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Verify Fitness Data
            </h2>

            <div className="text-gray-600 mb-6">
              <p>
                Now that your profile is verified, you can prove specific
                fitness metrics from your Garmin data.
              </p>
            </div>

            {/* Current Fitness Data Display */}
            {userFitnessData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium text-gray-900 mb-2">
                  Current Verified Data:
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Activities:{" "}
                    {userFitnessData.countOfActivities?.toString() ||
                      "Not verified"}
                  </div>
                  <div>
                    Total Distance:{" "}
                    {userFitnessData.totalDistance?.toString() ||
                      "Not verified"}{" "}
                    m
                  </div>
                  <div>
                    Total Calories:{" "}
                    {userFitnessData.totalCalories?.toString() ||
                      "Not verified"}
                  </div>
                  <div>
                    Max Heart Rate:{" "}
                    {userFitnessData.maxHeartRate?.toString() || "Not verified"}{" "}
                    bpm
                  </div>
                </div>
              </div>
            )}

            {/* Metric Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Fitness Metric to Verify:
              </label>
              <select
                value={selectedMetric.key}
                onChange={(e) =>
                  setSelectedMetric(
                    fitnessMetrics.find((m) => m.key === e.target.value) ||
                      fitnessMetrics[0]
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {fitnessMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            {/* End Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date for Data Collection:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleGenerateFitnessProof}
              disabled={isFitnessLoading || !isConnected || isWritePending}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${
                  isFitnessLoading || !isConnected || isWritePending
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {isFitnessLoading
                ? "Generating Fitness Proof..."
                : isWritePending
                ? "Waiting for Transaction..."
                : `Verify ${selectedMetric.label}`}
            </button>

            {fitnessError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
                {fitnessError}
              </div>
            )}

            {fitnessProofHash && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
                <p className="font-medium">
                  Fitness Data Verified Successfully!
                </p>
                <p className="mt-1 text-sm">Metric: {selectedMetric.label}</p>
                <p className="mt-2 text-sm break-all">
                  Transaction Hash: {fitnessProofHash}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Daily Summary Verification Section */}
        {username && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Verify Daily Summary Data
            </h2>

            <div className="text-gray-600 mb-6">
              <p>
                Verify specific daily wellness metrics from your Garmin data for
                a particular date.
              </p>
            </div>

            {/* User Display Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Display Name (UUID from Garmin):
              </label>
              <input
                type="text"
                value={userDisplayName}
                onChange={(e) => setUserDisplayName(e.target.value)}
                placeholder="e.g., 7b0fccd2-7a54-48e4-9133-6f0e72191f01"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find this UUID in your Garmin Connect profile URL
              </p>
            </div>

            {/* Calendar Date Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calendar Date:
              </label>
              <input
                type="date"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Daily Metric Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Daily Metric to Verify:
              </label>
              <select
                value={selectedDailyMetric.key}
                onChange={(e) =>
                  setSelectedDailyMetric(
                    dailySummaryMetrics.find((m) => m.key === e.target.value) ||
                      dailySummaryMetrics[0]
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {dailySummaryMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateDailySummaryProof}
              disabled={
                isDailySummaryLoading ||
                !isConnected ||
                isWritePending ||
                !userDisplayName.trim()
              }
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${
                  isDailySummaryLoading ||
                  !isConnected ||
                  isWritePending ||
                  !userDisplayName.trim()
                    ? "bg-purple-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
            >
              {isDailySummaryLoading
                ? "Generating Daily Summary Proof..."
                : isWritePending
                ? "Waiting for Transaction..."
                : `Verify ${selectedDailyMetric.label} for ${calendarDate}`}
            </button>

            {dailySummaryError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
                {dailySummaryError}
              </div>
            )}

            {dailySummaryProofHash && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
                <p className="font-medium">
                  Daily Summary Data Verified Successfully!
                </p>
                <p className="mt-1 text-sm">
                  Metric: {selectedDailyMetric.label}
                </p>
                <p className="mt-1 text-sm">Date: {calendarDate}</p>
                <p className="mt-2 text-sm break-all">
                  Transaction Hash: {dailySummaryProofHash}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
