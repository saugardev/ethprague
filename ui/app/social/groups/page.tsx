"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Abi } from "viem";
import { sepolia } from "viem/chains";
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
import Hero from "@/components/hero";
import CreateGroupModal from "@/components/CreateGroupModal";
import webProofVerifier from "../../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";
import webProofProver from "../../../../contracts/out/WebProofProver.sol/WebProofProver.json";
import {
  distributeMeritsWithErrorHandling,
  MERIT_REWARDS,
} from "../../../lib/merits";

const verifierAbi = webProofVerifier.abi as Abi;
const proverAbi = webProofProver.abi as Abi;

interface Group {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  memberCount: number;
  isFromContract?: boolean;
  communityId?: number;
  creator?: string;
  status?: "active" | "joined" | "joinable" | "not_eligible";
  minActivitiesRequired?: number;
}

interface UserFitnessData {
  userAddress: string;
  username: string;
  countOfActivities: bigint;
  totalDistance: bigint;
  totalCalories: bigint;
  avgHeartRate: bigint;
  lastUpdated: bigint;
}

const metricLabels: Record<
  string,
  { label: string; icon: string; unit: string }
> = {
  sleepScore: { label: "Sleep Score", icon: "😴", unit: "" },
  steps: { label: "Steps", icon: "🚶", unit: "" },
  caloriesBurned: { label: "Calories", icon: "🔥", unit: "" },
  fitnessAge: { label: "Fitness Age", icon: "💪", unit: "" },
  heartRate: { label: "Heart Rate", icon: "❤️", unit: "bpm" },
  workoutMinutes: { label: "Workout", icon: "🏋️", unit: "min/week" },
  countOfActivities: {
    label: "Activity Count",
    icon: "📊",
    unit: "activities",
  },
};

export default function Groups() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetricFilter, setSelectedMetricFilter] = useState("");
  const [isJoiningCommunity, setIsJoiningCommunity] = useState<number | null>(
    null
  );
  const [isLeavingCommunity, setIsLeavingCommunity] = useState<number | null>(
    null
  );

  // Community creation transaction tracking
  const [communityCreationTxHash, setCommunityCreationTxHash] = useState<
    `0x${string}` | null
  >(null);

  // Merits distribution states
  const [meritsMessage, setMeritsMessage] = useState<string | null>(null);
  const [meritsSuccess, setMeritsSuccess] = useState<boolean>(false);
  const [isDistributingMerits, setIsDistributingMerits] = useState(false);

  // Fitness verification modal states
  const [isFitnessModalOpen, setIsFitnessModalOpen] = useState(false);
  const endDate = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD format
  const [isFitnessLoading, setIsFitnessLoading] = useState(false);
  const [fitnessError, setFitnessError] = useState<string | null>(null);
  const [fitnessProofHash, setFitnessProofHash] = useState<string | null>(null);

  // Watch for community creation transaction confirmation
  const { isSuccess: isCommunityCreationTxSuccess } =
    useWaitForTransactionReceipt({
      hash: communityCreationTxHash || undefined,
    });

  // Distribute Merits when community creation is successful
  useEffect(() => {
    if (isCommunityCreationTxSuccess && communityCreationTxHash && address) {
      handleMeritsDistribution(
        address,
        MERIT_REWARDS.COMMUNITY_CREATION,
        "Community Creation Reward"
      );
      setCommunityCreationTxHash(null); // Reset after successful distribution
    }
  }, [isCommunityCreationTxSuccess, communityCreationTxHash, address]);

  // Function to handle Merits distribution
  const handleMeritsDistribution = async (
    userAddress: string,
    amount: string,
    description: string
  ) => {
    setIsDistributingMerits(true);
    setMeritsMessage(null);
    setMeritsSuccess(false);

    try {
      const result = await distributeMeritsWithErrorHandling(
        userAddress,
        amount,
        description
      );

      setMeritsSuccess(result.success);
      setMeritsMessage(result.message);

      if (result.success && result.data) {
        console.log("Merits distribution successful:", result.data);
      }
    } catch (error) {
      console.error("Error in Merits distribution:", error);
      setMeritsSuccess(false);
      setMeritsMessage("Failed to distribute Merits. Please try again later.");
    } finally {
      setIsDistributingMerits(false);
    }
  };

  // Fetch user's current fitness data to check eligibility
  const { data: userFitnessData, refetch: refetchUserFitnessData } =
    useReadContract({
      address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
      abi: verifierAbi,
      functionName: "getUserFitnessData",
      args: address ? [address] : undefined,
      query: {
        enabled: isConnected && !!address,
      },
    }) as { data: UserFitnessData | undefined; refetch: () => void };

  // Fetch username to check if profile is verified
  const { data: username } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getUsername",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: string | undefined };

  // Fetch all community IDs
  const { data: allCommunityIds, refetch: refetchCommunities } =
    useReadContract({
      address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
      abi: verifierAbi,
      functionName: "getAllCommunities",
      query: {
        enabled: isConnected,
      },
    }) as { data: bigint[] | undefined; refetch: () => void };

  // Fetch user's communities
  const { data: userCommunityIds, refetch: refetchUserCommunities } =
    useReadContract({
      address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
      abi: verifierAbi,
      functionName: "getUserCommunities",
      args: address ? [address] : undefined,
      query: {
        enabled: isConnected && !!address,
      },
    }) as { data: bigint[] | undefined; refetch: () => void };

  // Fetch joinable communities for user
  const { data: joinableCommunityIds, refetch: refetchJoinableCommunities } =
    useReadContract({
      address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
      abi: verifierAbi,
      functionName: "getJoinableCommunities",
      args: address ? [address] : undefined,
      query: {
        enabled: isConnected && !!address,
      },
    }) as { data: bigint[] | undefined; refetch: () => void };

  // Fetch individual community data using fixed hooks (no loops!)
  const community1 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[0] ? [allCommunityIds[0]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 0,
    },
  });

  const community2 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[1] ? [allCommunityIds[1]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 1,
    },
  });

  const community3 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[2] ? [allCommunityIds[2]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 2,
    },
  });

  const community4 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[3] ? [allCommunityIds[3]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 3,
    },
  });

  const community5 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[4] ? [allCommunityIds[4]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 4,
    },
  });

  const community6 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[5] ? [allCommunityIds[5]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 5,
    },
  });

  const community7 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[6] ? [allCommunityIds[6]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 6,
    },
  });

  const community8 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[7] ? [allCommunityIds[7]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 7,
    },
  });

  const community9 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[8] ? [allCommunityIds[8]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 8,
    },
  });

  const community10 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getCommunity",
    args:
      allCommunityIds && allCommunityIds[9] ? [allCommunityIds[9]] : undefined,
    query: {
      enabled: isConnected && allCommunityIds && allCommunityIds.length > 9,
    },
  });

  const communityQueries = [
    community1,
    community2,
    community3,
    community4,
    community5,
    community6,
    community7,
    community8,
    community9,
    community10,
  ];

  // Convert contract communities to Group format
  const contractGroups: Group[] = useMemo(() => {
    if (!allCommunityIds || allCommunityIds.length === 0) return [];

    const communities: Group[] = [];

    allCommunityIds.forEach((communityId, index) => {
      if (index >= communityQueries.length || !communityQueries[index]?.data)
        return;

      const communityData = communityQueries[index].data;

      const community = communityData as {
        communityId: bigint;
        title: string;
        creator: string;
        minActivitiesRequired: bigint;
        memberCount: bigint;
        createdAt: bigint;
      };

      const actualCommunityId = Number(community.communityId);
      const userActivities = userFitnessData
        ? Number(userFitnessData.countOfActivities)
        : 0;
      const minRequired = Number(community.minActivitiesRequired);

      // Determine status
      let status: "active" | "joined" | "joinable" | "not_eligible" =
        "not_eligible";

      if (
        userCommunityIds &&
        userCommunityIds.some((id) => Number(id) === actualCommunityId)
      ) {
        status = "joined";
      } else if (
        joinableCommunityIds &&
        joinableCommunityIds.some((id) => Number(id) === actualCommunityId)
      ) {
        status = "joinable";
      } else if (userActivities >= minRequired) {
        status = "joinable";
      }

      const communityItem: Group = {
        id: `contract-${actualCommunityId}`,
        name: community.title,
        description: `Minimum ${minRequired} activities required • Verified fitness community`,
        metrics: {
          countOfActivities: minRequired,
        },
        memberCount: Number(community.memberCount),
        isFromContract: true,
        communityId: actualCommunityId,
        creator: community.creator,
        status: status,
        minActivitiesRequired: minRequired,
      };

      communities.push(communityItem);
    });

    return communities;
  }, [
    allCommunityIds,
    community1.data,
    community2.data,
    community3.data,
    community4.data,
    community5.data,
    community6.data,
    community7.data,
    community8.data,
    community9.data,
    community10.data,
    userCommunityIds,
    joinableCommunityIds,
    userFitnessData,
  ]);

  // Mock groups for examples (read-only)
  const mockGroups: Group[] = [
    {
      id: "1",
      name: "Early Birds",
      description:
        "For those who wake up early and maintain excellent sleep habits",
      metrics: {
        sleepScore: 85,
        steps: 12000,
        caloriesBurned: 600,
      },
      memberCount: 42,
    },
    {
      id: "2",
      name: "Step Masters",
      description:
        "High-activity group for people who love walking and running",
      metrics: {
        steps: 15000,
        caloriesBurned: 800,
        workoutMinutes: 200,
      },
      memberCount: 38,
    },
    {
      id: "3",
      name: "Heart Health Focus",
      description:
        "Dedicated to cardiovascular health and heart rate optimization",
      metrics: {
        heartRate: 65,
        workoutMinutes: 150,
        fitnessAge: 25,
      },
      memberCount: 29,
    },
    {
      id: "4",
      name: "Marathon Trainers",
      description:
        "Elite runners preparing for marathons and long-distance events",
      metrics: {
        steps: 20000,
        caloriesBurned: 1200,
        heartRate: 55,
        workoutMinutes: 300,
      },
      memberCount: 18,
    },
    {
      id: "5",
      name: "Sleep Warriors",
      description: "Optimizing sleep quality and recovery for peak performance",
      metrics: {
        sleepScore: 92,
        heartRate: 58,
        fitnessAge: 22,
      },
      memberCount: 35,
    },
  ];

  const handleCreateGroup = (groupData: Omit<Group, "id" | "memberCount">) => {
    if (!isConnected) {
      alert("Please connect your wallet to create an onchain community");
      return;
    }

    // Always create onchain communities for new groups
    // Derive minimum activities requirement from metrics complexity
    let minActivitiesRequired: number;

    if (groupData.metrics.countOfActivities) {
      // If user explicitly set activity count, use that
      minActivitiesRequired = groupData.metrics.countOfActivities;
    } else {
      // Derive from metric complexity: more metrics = higher activity requirement
      const metricCount = Object.keys(groupData.metrics).length;
      const metricValues = Object.values(groupData.metrics);
      const avgMetricValue =
        metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;

      // Base requirement: 5 activities + 2 per additional metric + scaling based on metric values
      minActivitiesRequired = Math.max(
        5,
        Math.floor(5 + (metricCount - 1) * 2 + avgMetricValue / 1000)
      );

      // Cap between 5 and 50 activities
      minActivitiesRequired = Math.min(50, Math.max(5, minActivitiesRequired));
    }

    console.log("Creating onchain community:", {
      title: groupData.name,
      minActivitiesRequired,
      metrics: groupData.metrics,
    });

    writeContract(
      {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
        abi: verifierAbi,
        functionName: "createCommunity",
        args: [groupData.name, BigInt(minActivitiesRequired)],
      },
      {
        onSuccess: (txHash) => {
          console.log("Onchain community created successfully:", txHash);
          // Set transaction hash for merit distribution tracking
          setCommunityCreationTxHash(txHash);
          // Refresh community data to show the new community
          refetchCommunities();
          // Refetch all community queries
          communityQueries.forEach((query) => query.refetch());
        },
        onError: (error) => {
          console.error("Failed to create onchain community:", error);
          alert(
            "Failed to create onchain community. Please try again or check your wallet connection."
          );
        },
      }
    );
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
          notarize(fitnessUrl, "GET", "Generate Proof of Count of Activities", [
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
          ]),
        ],
      });

      const result = await vlayer.proveWeb({
        address: process.env.NEXT_PUBLIC_PROVER_ADDRESS as `0x${string}`,
        proverAbi: proverAbi as Abi,
        functionName: "getCountOfActivities",
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
          functionName: "verifyCountOfActivities",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: result2 as any,
        },
        {
          onSuccess: (txHash) => {
            console.log("Fitness verification successful:", txHash);
            setFitnessProofHash(txHash);
            // Refresh all relevant data after successful verification
            refetchUserFitnessData();
            refetchCommunities();
            refetchUserCommunities();
            refetchJoinableCommunities();
            // Refetch all community queries to update status
            communityQueries.forEach((query) => query.refetch());
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

  const closeFitnessModal = () => {
    setIsFitnessModalOpen(false);
    setFitnessError(null);
    setFitnessProofHash(null);
  };

  const handleJoinCommunity = (communityId: number) => {
    if (!isConnected || !address) return;

    setIsJoiningCommunity(communityId);

    writeContract(
      {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
        abi: verifierAbi,
        functionName: "joinCommunity",
        args: [BigInt(communityId)],
      },
      {
        onSuccess: (txHash) => {
          console.log("Joined community successfully:", txHash);
          refetchCommunities();
          refetchUserCommunities();
          setIsJoiningCommunity(null);
        },
        onError: (error) => {
          console.error("Failed to join community:", error);
          setIsJoiningCommunity(null);
        },
      }
    );
  };

  const handleLeaveCommunity = (communityId: number) => {
    if (!isConnected || !address) return;

    setIsLeavingCommunity(communityId);

    writeContract(
      {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
        abi: verifierAbi,
        functionName: "leaveCommunity",
        args: [BigInt(communityId)],
      },
      {
        onSuccess: (txHash) => {
          console.log("Left community successfully:", txHash);
          refetchCommunities();
          refetchUserCommunities();
          setIsLeavingCommunity(null);
        },
        onError: (error) => {
          console.error("Failed to leave community:", error);
          setIsLeavingCommunity(null);
        },
      }
    );
  };

  const formatMetricValue = (key: string, value: number) => {
    if (key === "steps" || key === "caloriesBurned") {
      // Use consistent formatting that doesn't depend on locale
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return value.toString();
  };

  // Get all unique metrics across all groups
  const availableMetrics = useMemo(() => {
    const allMetrics = new Set<string>();
    // Combine contract and mock groups
    const allGroupsCombined = [...contractGroups, ...mockGroups];
    allGroupsCombined.forEach((group) => {
      Object.keys(group.metrics).forEach((metric) => allMetrics.add(metric));
    });
    return Array.from(allMetrics).map((metric) => ({
      key: metric,
      label: metricLabels[metric]?.label || metric,
    }));
  }, [contractGroups, mockGroups]);

  // Filter groups based on search and metric filter
  const filteredGroups = useMemo(() => {
    // Combine contract and mock groups
    const allGroupsCombined = [...contractGroups, ...mockGroups];
    return allGroupsCombined.filter((group) => {
      const matchesSearch =
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMetric =
        !selectedMetricFilter ||
        group.metrics.hasOwnProperty(selectedMetricFilter);

      return matchesSearch && matchesMetric;
    });
  }, [contractGroups, mockGroups, searchTerm, selectedMetricFilter]);

  return (
    <>
      <Hero
        title="Health & Fitness Groups"
        subtitle="Join communities based on your health metrics and fitness goals."
        showCta={false}
      />

      {/* Merits Notification */}
      {(meritsMessage || isDistributingMerits) && (
        <div
          className={`mt-8 alert ${
            isDistributingMerits
              ? "alert-info"
              : meritsSuccess
              ? "alert-success"
              : "alert-warning"
          }`}
        >
          {isDistributingMerits ? (
            <div className="flex items-center">
              <span className="loading loading-spinner loading-sm mr-2"></span>
              <span>Distributing Merits reward...</span>
            </div>
          ) : (
            <div>
              <div className="font-medium">
                {meritsSuccess ? "🎉 Reward Distributed!" : "⚠️ Reward Notice"}
              </div>
              <div className="text-sm mt-1">{meritsMessage}</div>
            </div>
          )}
        </div>
      )}

      {/* Compact Fitness Verification Section */}
      {isConnected && !username && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-amber-600">⚠️</div>
              <div>
                <h3 className="font-semibold text-amber-800">
                  Profile Verification Required
                </h3>
                <p className="text-sm text-amber-700">
                  Verify your Garmin profile first to access communities
                </p>
              </div>
            </div>
            <a href="/test" className="btn btn-warning btn-sm">
              Verify Profile
            </a>
          </div>
        </div>
      )}

      {isConnected &&
        username &&
        userFitnessData &&
        Number(userFitnessData.countOfActivities) === 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">📊</div>
                <div>
                  <h3 className="font-semibold text-blue-800">
                    Verify Fitness Data
                  </h3>
                  <p className="text-sm text-blue-700">
                    Prove your activity count to join communities
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFitnessModalOpen(true)}
                className="btn btn-primary btn-sm"
                disabled={!isConnected}
              >
                Verify Activities
              </button>
            </div>
          </div>
        )}

      <div className="mt-8">
        <div className="flex flex-col lg:flex-row justify-center items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto justify-center items-center">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search groups..."
                className="input input-bordered w-full sm:w-64 pl-10 focus:input-success rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-base-content/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Metric Filter */}
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-outline w-full sm:w-48 justify-between rounded-md border-base-300 hover:border-success focus:border-success"
              >
                <span className="flex items-center gap-2">
                  {selectedMetricFilter ? (
                    <>
                      <span>{metricLabels[selectedMetricFilter]?.icon}</span>
                      <span>{metricLabels[selectedMetricFilter]?.label}</span>
                    </>
                  ) : (
                    <span>All Metrics</span>
                  )}
                </span>
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-1"
              >
                <li>
                  <button
                    className={`flex items-center gap-2 ${
                      !selectedMetricFilter
                        ? "active bg-success text-success-content"
                        : ""
                    }`}
                    onClick={() => setSelectedMetricFilter("")}
                  >
                    <span className="w-5 text-center">🔍</span>
                    <span>All Metrics</span>
                  </button>
                </li>
                <div className="divider my-1"></div>
                {availableMetrics.map((metric) => (
                  <li key={metric.key}>
                    <button
                      className={`flex items-center gap-2 ${
                        selectedMetricFilter === metric.key
                          ? "active bg-success text-success-content"
                          : ""
                      }`}
                      onClick={() => setSelectedMetricFilter(metric.key)}
                    >
                      <span className="w-5 text-center">
                        {metricLabels[metric.key]?.icon}
                      </span>
                      <span>{metric.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Create Group Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                className="btn btn-success px-6"
                onClick={() => {
                  const modal = document.getElementById(
                    "create_group_modal"
                  ) as HTMLDialogElement;
                  modal?.showModal();
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Group
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-base-content/70 mb-4">
          {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""}{" "}
          found
        </div>

        <div className="grid gap-6">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="card bg-gradient-to-br from-success to-success/80 text-success-content shadow-xl hover:shadow-2xl transition-all duration-300 border border-success/20"
            >
              <div className="card-body p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="card-title text-xl text-white mb-2">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            {group.memberCount} members
                          </div>
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            {Object.keys(group.metrics).length} metrics
                          </div>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(group.metrics).map(([key, value]) => {
                        const metricInfo = metricLabels[key];
                        if (!metricInfo) return null;

                        return (
                          <div
                            key={key}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{metricInfo.icon}</span>
                              <span className="text-white/80 text-sm font-medium">
                                {metricInfo.label}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-white">
                                {formatMetricValue(key, value)}
                              </span>
                              {metricInfo.unit && (
                                <span className="text-white/60 text-xs">
                                  {metricInfo.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Area */}
                  <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[120px]">
                    {/* Handle contract-based communities */}
                    {group.isFromContract && group.communityId ? (
                      <>
                        {!isConnected ? (
                          <button
                            className="btn btn-success bg-white/20 border-white/30 hover:bg-white/30 text-white flex-1 lg:flex-none"
                            onClick={() =>
                              alert(
                                "Please connect your wallet to join communities"
                              )
                            }
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                              />
                            </svg>
                            Join
                          </button>
                        ) : group.status === "joined" ? (
                          <>
                            <button
                              className="btn btn-error bg-white/20 border-white/30 hover:bg-white/30 text-white flex-1 lg:flex-none"
                              onClick={() =>
                                handleLeaveCommunity(group.communityId!)
                              }
                              disabled={
                                isLeavingCommunity === group.communityId
                              }
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"
                                />
                              </svg>
                              {isLeavingCommunity === group.communityId
                                ? "Leaving..."
                                : "Leave"}
                            </button>
                            <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                              Member
                            </div>
                          </>
                        ) : group.status === "not_eligible" &&
                          group.minActivitiesRequired ? (
                          <>
                            <button
                              className="btn btn-disabled bg-white/10 border-white/20 text-white/50 flex-1 lg:flex-none"
                              disabled
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              Not Eligible
                            </button>
                            <div className="text-xs text-white/60 flex-1 lg:flex-none text-center">
                              Need{" "}
                              {group.minActivitiesRequired -
                                (userFitnessData
                                  ? Number(userFitnessData.countOfActivities)
                                  : 0)}{" "}
                              more activities
                            </div>
                          </>
                        ) : (
                          // Default join button for eligible users or unknown status
                          <button
                            className="btn btn-success bg-white/20 border-white/30 hover:bg-white/30 text-white flex-1 lg:flex-none"
                            onClick={() =>
                              handleJoinCommunity(group.communityId!)
                            }
                            disabled={isJoiningCommunity === group.communityId}
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                              />
                            </svg>
                            {isJoiningCommunity === group.communityId
                              ? "Joining..."
                              : "Join"}
                          </button>
                        )}
                      </>
                    ) : (
                      /* Regular mock groups */
                      <>
                        <button className="btn btn-success bg-white/20 border-white/30 hover:bg-white/30 text-white flex-1 lg:flex-none">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                          </svg>
                          Join
                        </button>
                        <button className="btn btn-outline border-white/30 text-white hover:bg-white/10 flex-1 lg:flex-none">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Info
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No groups found</h3>
            <p className="text-base-content/70 mb-4">
              {searchTerm || selectedMetricFilter
                ? "Try adjusting your search or filters"
                : "Create the first group to get started"}
            </p>
            {(searchTerm || selectedMetricFilter) && (
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMetricFilter("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <CreateGroupModal onCreateGroup={handleCreateGroup} />

      {/* Fitness Verification Modal */}
      {isFitnessModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Verify Fitness Data</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeFitnessModal}
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-base-content/70 mb-6">
              <p>
                Generate a web proof to verify your Garmin activity count. This
                will:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Open your Garmin Connect data</li>
                <li>Generate proof of your activity count (up to today)</li>
                <li>Update your on-chain fitness data</li>
              </ul>
            </div>

            {/* Current Fitness Data Display */}
            {userFitnessData && (
              <div className="mb-6 p-3 bg-base-200 rounded-md">
                <h4 className="font-medium text-sm mb-2">
                  Current Verified Data:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Activities:{" "}
                    {userFitnessData.countOfActivities?.toString() || "0"}
                  </div>
                  <div>
                    Total Distance:{" "}
                    {userFitnessData.totalDistance?.toString() || "0"} m
                  </div>
                  <div>
                    Total Calories:{" "}
                    {userFitnessData.totalCalories?.toString() || "0"}
                  </div>
                  <div>
                    Avg Heart Rate:{" "}
                    {userFitnessData.avgHeartRate?.toString() || "0"} bpm
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateFitnessProof}
              disabled={isFitnessLoading || !isConnected}
              className={`btn w-full mb-4 ${
                isFitnessLoading || !isConnected
                  ? "btn-disabled"
                  : "btn-primary"
              }`}
            >
              {!isConnected
                ? "Connect Wallet to Continue"
                : isFitnessLoading
                ? "Generating Proof..."
                : "Verify Count of Activities"}
            </button>

            {fitnessError && (
              <div className="alert alert-error mb-4">
                <span className="text-sm">{fitnessError}</span>
              </div>
            )}

            {fitnessProofHash && (
              <div className="alert alert-success">
                <div>
                  <p className="font-medium text-sm">
                    Fitness Data Verified Successfully!
                  </p>
                  <p className="text-xs mt-1 break-all opacity-70">
                    Transaction Hash: {fitnessProofHash}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="modal-backdrop" onClick={closeFitnessModal}></div>
        </div>
      )}
    </>
  );
}
