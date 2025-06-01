"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
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
import CreateTargetModal from "@/components/CreateTargetModal";
import webProofVerifier from "../../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";
import webProofProver from "../../../../contracts/out/WebProofProver.sol/WebProofProver.json";

const verifierAbi = webProofVerifier.abi as Abi;
const proverAbi = webProofProver.abi as Abi;

interface Target {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  deadline: string;
  status: 'active' | 'closed' | 'completed' | 'failed';
  progress: number;
  isFromContract?: boolean;
  betId?: number;
  actualSteps?: number;
  goalAchieved?: boolean;
}

const metricLabels: Record<string, { label: string; icon: string; unit: string }> = {
  sleepScore: { label: "Sleep Score", icon: "😴", unit: "" },
  steps: { label: "Steps", icon: "🚶", unit: "" },
  caloriesBurned: { label: "Calories", icon: "🔥", unit: "" },
  fitnessAge: { label: "Fitness Age", icon: "💪", unit: "" },
  heartRate: { label: "Heart Rate", icon: "❤️", unit: "bpm" },
  workoutMinutes: { label: "Workout", icon: "🏋️", unit: "min/week" }
};

export default function Targets() {
  const { address, isConnected } = useAccount();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetricFilter, setSelectedMetricFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Add states for bet operations
  const [isClosingBet, setIsClosingBet] = useState<number | null>(null);
  const [isResolvingBet, setIsResolvingBet] = useState<number | null>(null);
  const [resolveModalBetId, setResolveModalBetId] = useState<number | null>(null);
  const [resolveModalTargetDate, setResolveModalTargetDate] = useState<string>("");

  const { writeContract } = useWriteContract();

  // Fetch user UUID from contract
  const { data: userUuid } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "addressToUsername",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
    },
  }) as { data: string | undefined };

  // Mock targets (existing ones)
  const [mockTargets, setMockTargets] = useState<Target[]>([
    {
      id: "1",
      name: "Morning Warrior",
      description: "Achieve consistent early morning workouts with quality sleep",
      metrics: {
        sleepScore: 85,
        workoutMinutes: 30
      },
      deadline: "2024-02-15",
      status: 'active',
      progress: 75
    },
    {
      id: "2", 
      name: "10K Steps Daily",
      description: "Maintain 10,000 steps per day for consistent activity",
      metrics: {
        steps: 10000
      },
      deadline: "2024-02-28",
      status: 'active',
      progress: 60
    },
    {
      id: "3",
      name: "Heart Health Focus",
      description: "Optimize cardiovascular health through targeted training",
      metrics: {
        heartRate: 65,
        workoutMinutes: 150
      },
      deadline: "2024-03-01",
      status: 'active',
      progress: 45
    },
    {
      id: "4",
      name: "Calorie Burner",
      description: "Burn 500 calories daily through various activities",
      metrics: {
        caloriesBurned: 500,
        steps: 8000
      },
      deadline: "2024-01-30",
      status: 'completed',
      progress: 100
    }
  ]);

  // Fetch ALL bet IDs
  const { data: allBetIds, refetch: refetchActiveBets } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getAllBets",
    query: {
      enabled: isConnected,
    },
  }) as { data: bigint[] | undefined; refetch: () => void };

  // Fetch individual bet data for up to 10 bets (we can expand this later)
  const bet1 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: allBetIds && allBetIds[0] ? [allBetIds[0]] : undefined,
    query: {
      enabled: isConnected && allBetIds && allBetIds.length > 0,
    },
  });

  const bet2 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: allBetIds && allBetIds[1] ? [allBetIds[1]] : undefined,
    query: {
      enabled: isConnected && allBetIds && allBetIds.length > 1,
    },
  });

  const bet3 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: allBetIds && allBetIds[2] ? [allBetIds[2]] : undefined,
    query: {
      enabled: isConnected && allBetIds && allBetIds.length > 2,
    },
  });

  const bet4 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: allBetIds && allBetIds[3] ? [allBetIds[3]] : undefined,
    query: {
      enabled: isConnected && allBetIds && allBetIds.length > 3,
    },
  });

  const bet5 = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: allBetIds && allBetIds[4] ? [allBetIds[4]] : undefined,
    query: {
      enabled: isConnected && allBetIds && allBetIds.length > 4,
    },
  });

  // Refetch function for all bet data
  const refetchBetData = () => {
    bet1.refetch();
    bet2.refetch();
    bet3.refetch();
    bet4.refetch();
    bet5.refetch();
  };

  // Convert contract bets to Target format
  const contractTargets: Target[] = useMemo(() => {
    if (!allBetIds || allBetIds.length === 0) return [];
    
    console.log("Bet IDs:", allBetIds);
    
    const targets: Target[] = [];
    const betQueries = [bet1, bet2, bet3, bet4, bet5];
    
    allBetIds.forEach((betId, index) => {
      if (index >= betQueries.length) return; // Skip if we don't have enough queries
      
      const betQuery = betQueries[index];
      const betData = betQuery.data;
      
      if (!betData) {
        console.log(`No data for bet ${index}:`, betQuery);
        return;
      }
      
      console.log(`Processing bet ${index}:`, betData);
      
      const bet = betData as {
        betId: bigint;
        creator: string;
        targetDate: string;
        minimumSteps: bigint;
        totalPoolFor: bigint;
        totalPoolAgainst: bigint;
        status: number;
        goalAchieved: boolean;
        actualSteps: bigint;
        createdAt: bigint;
        closedAt: bigint;
        resolvedAt: bigint;
      };

      // Safe number conversions with fallbacks
      const minimumSteps = bet.minimumSteps ? Number(bet.minimumSteps) : 0;
      const totalPoolFor = bet.totalPoolFor ? Number(bet.totalPoolFor) : 0;
      const totalPoolAgainst = bet.totalPoolAgainst ? Number(bet.totalPoolAgainst) : 0;
      const actualBetId = bet.betId ? Number(bet.betId) : Number(betId);
      const actualSteps = bet.actualSteps ? Number(bet.actualSteps) : undefined;

      // Calculate bet pool percentage (% betting FOR)
      const totalPool = totalPoolFor + totalPoolAgainst;
      const forPercentage = totalPool > 0 ? Math.round((totalPoolFor / totalPool) * 100) : 50;

      const target = {
        id: `contract-${actualBetId}`,
        name: `Step Challenge #${actualBetId}`,
        description: `Achieve ${minimumSteps.toLocaleString()} steps by ${bet.targetDate || 'TBD'}`,
        metrics: {
          steps: minimumSteps
        },
        deadline: bet.targetDate || '2024-12-31',
        status: bet.status === 0 ? 'active' as const : 
                bet.status === 1 ? 'closed' as const : // Closed bets
                bet.status === 2 ? 
                  (bet.goalAchieved ? 'completed' as const : 'failed' as const) : 
                  'active' as const,
        progress: bet.status === 2 ? 
          (bet.goalAchieved ? 100 : 0) : 
          forPercentage,
        isFromContract: true,
        betId: actualBetId,
        actualSteps: actualSteps,
        goalAchieved: bet.goalAchieved
      };

      console.log("Created target:", target);
      targets.push(target);
    });

    console.log("Final targets:", targets);
    return targets;
  }, [allBetIds, bet1.data, bet2.data, bet3.data, bet4.data, bet5.data]);

  // Combine contract targets first, then mock targets
  const allTargets = [...contractTargets, ...mockTargets];

  const handleCreateTarget = (targetData: Omit<Target, 'id' | 'status' | 'progress'>) => {
    // Check if this is a steps-based target that should create a bet
    const hasSteps = targetData.metrics.steps;
    
    if (hasSteps && isConnected) {
      // Create a bet on the smart contract
      const stepsGoal = targetData.metrics.steps;
      const targetDateFormatted = targetData.deadline; // Assuming YYYY-MM-DD format
      
      console.log("Creating bet with:", {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS,
        targetDate: targetDateFormatted,
        minimumSteps: stepsGoal,
        value: "100000000000000000"
      });

      // Debug: Check if the function exists in the ABI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log("Verifier ABI functions:", verifierAbi.filter((item: any) => item.type === 'function').map((item: any) => item.name));
      
      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: "createStepsBet",
          args: [targetDateFormatted, BigInt(stepsGoal)],
          value: BigInt("100000000000000000"), // 0.1 ETH
        },
        {
          onSuccess: (txHash) => {
            console.log("Bet created successfully:", txHash);
            // Refetch active bets when a new bet is created
            refetchActiveBets();
          },
          onError: (error) => {
            console.error("Failed to create bet:", error);
            console.error("Error details:", {
              message: error.message,
              cause: error.cause,
              name: error.name
            });
            // Fallback to creating a local target
            createLocalTarget(targetData);
          },
        }
      );
    } else {
      // Create a local target for non-steps metrics
      createLocalTarget(targetData);
    }
  };

  const createLocalTarget = (targetData: Omit<Target, 'id' | 'status' | 'progress'>) => {
    const newTarget: Target = {
      id: Date.now().toString(),
      ...targetData,
      status: 'active',
      progress: 0
    };
    setMockTargets([...mockTargets, newTarget]);
  };

  const handlePlaceBet = (betId: number, bettingFor: boolean, amount: string) => {
    if (!isConnected || !address) return;
    
    writeContract(
      {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
        abi: verifierAbi,
        functionName: "placeBet",
        args: [BigInt(betId), bettingFor],
        value: BigInt(amount), // Amount in wei
      },
      {
        onSuccess: (txHash) => {
          console.log("Bet placed successfully:", txHash);
          // Refetch the bet data to update the betting pool percentages
          refetchBetData();
          refetchActiveBets();
        },
        onError: (error) => {
          console.error("Failed to place bet:", error);
        },
      }
    );
  };

  const handleCloseBet = (betId: number) => {
    if (!isConnected || !address) return;
    
    setIsClosingBet(betId);
    
    writeContract(
      {
        address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
        abi: verifierAbi,
        functionName: "closeBet",
        args: [BigInt(betId)],
      },
      {
        onSuccess: (txHash) => {
          console.log("Bet closed successfully:", txHash);
          refetchBetData();
          refetchActiveBets();
          setIsClosingBet(null);
        },
        onError: (error) => {
          console.error("Failed to close bet:", error);
          setIsClosingBet(null);
        },
      }
    );
  };

  const openResolveModal = (betId: number, targetDate: string) => {
    setResolveModalBetId(betId);
    setResolveModalTargetDate(targetDate);
    const modal = document.getElementById('resolve_bet_modal') as HTMLDialogElement;
    modal?.showModal();
  };

  const closeResolveModal = () => {
    setResolveModalBetId(null);
    setResolveModalTargetDate("");
    const modal = document.getElementById('resolve_bet_modal') as HTMLDialogElement;
    modal?.close();
  };

  const handleResolveBet = async () => {
    if (!isConnected || !address || !resolveModalBetId || !userUuid) return;

    if (!userUuid.trim()) {
      alert("You need to register your Garmin UUID first before resolving bets");
      return;
    }

    try {
      setIsResolvingBet(resolveModalBetId);

      const vlayer = createVlayerClient({
        url: process.env.NEXT_PUBLIC_PROVER_URL,
        webProofProvider: createExtensionWebProofProvider({
          notaryUrl: process.env.NEXT_PUBLIC_NOTARY_URL,
          wsProxyUrl: process.env.NEXT_PUBLIC_WS_PROXY_URL,
          token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
        }),
        token: process.env.NEXT_PUBLIC_VLAYER_API_TOKEN,
      });

      const dailySummaryUrl = `https://connect.garmin.com/usersummary-service/usersummary/daily/${userUuid}?calendarDate=${resolveModalTargetDate}`;
      const dailyUrl = `https://connect.garmin.com/modern/sleep/${resolveModalTargetDate}/0`;

      const webProofRequest = createWebProofRequest({
        logoUrl: "/logo.png",
        steps: [
          startPage(dailyUrl, "Go to Garmin Connect"),
          expectUrl(dailyUrl, "Getting daily data"),
          notarize(
            dailySummaryUrl,
            "GET",
            `Generate Proof of Steps for ${resolveModalTargetDate}`,
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

      console.log("Generating web proof for bet resolution...");
      const result = await vlayer.proveWeb({
        address: process.env.NEXT_PUBLIC_PROVER_ADDRESS as `0x${string}`,
        proverAbi: proverAbi as Abi,
        functionName: "getDailySteps",
        // @ts-expect-error Type 'any' is not assignable to type 'never'
        args: [webProofRequest, address, userUuid, resolveModalTargetDate],
        chainId: sepolia.id,
      });

      console.log("Web proof result:", result);

      const result2 = await vlayer.waitForProvingResult({ hash: result });
      console.log("Final proof result:", result2);

      // First verify the daily steps data
      writeContract(
        {
          address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
          abi: verifierAbi,
          functionName: "verifyDailySteps",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: [...(result2 as any), resolveModalTargetDate],
        },
        {
          onSuccess: (txHash) => {
            console.log("Daily steps verified successfully:", txHash);
            
            // Now resolve the bet
            writeContract(
              {
                address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
                abi: verifierAbi,
                functionName: "resolveBet",
                args: [BigInt(resolveModalBetId)],
              },
              {
                onSuccess: (resolveTxHash) => {
                  console.log("Bet resolved successfully:", resolveTxHash);
                  refetchBetData();
                  refetchActiveBets();
                  setIsResolvingBet(null);
                  closeResolveModal();
                },
                onError: (error) => {
                  console.error("Failed to resolve bet:", error);
                  setIsResolvingBet(null);
                },
              }
            );
          },
          onError: (error) => {
            console.error("Failed to verify daily steps:", error);
            setIsResolvingBet(null);
          },
        }
      );
    } catch (err) {
      console.error("Error resolving bet:", err);
      setIsResolvingBet(null);
    }
  };

  const formatMetricValue = (key: string, value: number) => {
    if (key === 'steps' || key === 'caloriesBurned') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'closed': return 'info';
      default: return 'warning';
    }
  };

  // Get all unique metrics across all targets
  const availableMetrics = useMemo(() => {
    const allMetrics = new Set<string>();
    allTargets.forEach(target => {
      Object.keys(target.metrics).forEach(metric => allMetrics.add(metric));
    });
    return Array.from(allMetrics).map(metric => ({
      key: metric,
      label: metricLabels[metric]?.label || metric
    }));
  }, [allTargets]);

  // Filter targets based on search, metric filter, and status filter
  const filteredTargets = useMemo(() => {
    return allTargets.filter(target => {
      const matchesSearch = target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           target.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMetric = !selectedMetricFilter || 
                           target.metrics.hasOwnProperty(selectedMetricFilter);
      
      const matchesStatus = !statusFilter || target.status === statusFilter;
      
      return matchesSearch && matchesMetric && matchesStatus;
    });
  }, [allTargets, searchTerm, selectedMetricFilter, statusFilter]);

  return (
    <>
      <Hero 
        title="Training Targets"
        subtitle="Set measurable fitness goals using sleep, steps, heart rate, and more."
        showCta={false}
      />

      <div className="mt-8">
        {/* Connection status */}
        {!isConnected && (
          <div className="alert alert-info mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Connect your wallet to create step-based targets with betting functionality!</span>
          </div>
        )}

        {/* UUID Status */}
        {isConnected && !userUuid && (
          <div className="alert alert-warning mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <span>Register your Garmin UUID to resolve bets and earn rewards!</span>
          </div>
        )}

        {isConnected && userUuid && (
          <div className="alert alert-success mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Garmin connected! UUID: {userUuid.substring(0, 8)}...</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search targets..."
                className="input input-bordered w-full sm:w-64 pl-10 focus:input-success rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-outline w-full sm:w-40 justify-between rounded-md border-base-300 hover:border-success focus:border-success">
                <span className="flex items-center gap-2">
                  {statusFilter ? (
                    <>
                      <span>{statusFilter === 'active' ? '🎯' : statusFilter === 'completed' ? '✅' : '❌'}</span>
                      <span className="capitalize">{statusFilter}</span>
                    </>
                  ) : (
                    <span>All Status</span>
                  )}
                </span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-1">
                <li>
                  <button 
                    className={`flex items-center gap-2 ${!statusFilter ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setStatusFilter("")}
                  >
                    <span className="w-5 text-center">🔍</span>
                    <span>All Status</span>
                  </button>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button 
                    className={`flex items-center gap-2 ${statusFilter === 'active' ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    <span className="w-5 text-center">🎯</span>
                    <span>Active</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`flex items-center gap-2 ${statusFilter === 'completed' ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setStatusFilter("completed")}
                  >
                    <span className="w-5 text-center">✅</span>
                    <span>Completed</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`flex items-center gap-2 ${statusFilter === 'closed' ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setStatusFilter("closed")}
                  >
                    <span className="w-5 text-center">🔒</span>
                    <span>Closed</span>
                  </button>
                </li>
                <li>
                  <button 
                    className={`flex items-center gap-2 ${statusFilter === 'failed' ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setStatusFilter("failed")}
                  >
                    <span className="w-5 text-center">❌</span>
                    <span>Failed</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Metric Filter */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-outline w-full sm:w-48 justify-between rounded-md border-base-300 hover:border-success focus:border-success">
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
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-200 mt-1">
                <li>
                  <button 
                    className={`flex items-center gap-2 ${!selectedMetricFilter ? 'active bg-success text-success-content' : ''}`}
                    onClick={() => setSelectedMetricFilter("")}
                  >
                    <span className="w-5 text-center">🔍</span>
                    <span>All Metrics</span>
                  </button>
                </li>
                <div className="divider my-1"></div>
                {availableMetrics.map(metric => (
                  <li key={metric.key}>
                    <button 
                      className={`flex items-center gap-2 ${selectedMetricFilter === metric.key ? 'active bg-success text-success-content' : ''}`}
                      onClick={() => setSelectedMetricFilter(metric.key)}
                    >
                      <span className="w-5 text-center">{metricLabels[metric.key]?.icon}</span>
                      <span>{metric.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Create Target Button */}
            <button 
              className="btn btn-success px-6"
              onClick={() => {
                const modal = document.getElementById('create_target_modal') as HTMLDialogElement;
                modal?.showModal();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-base-content/70 mb-4">
          {filteredTargets.length} target{filteredTargets.length !== 1 ? 's' : ''} found
          {contractTargets.length > 0 && (
            <span className="ml-2 badge badge-success badge-sm">
              {contractTargets.length} from smart contract
            </span>
          )}
        </div>

        <div className="grid gap-6">
          {filteredTargets.map((target) => (
            <div key={target.id} className={`card bg-gradient-to-br ${target.isFromContract ? 'from-primary to-primary/80' : 'from-success to-success/80'} text-success-content shadow-xl hover:shadow-2xl transition-all duration-300 border ${target.isFromContract ? 'border-primary/20' : 'border-success/20'}`}>
              <div className="card-body p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`card-title text-xl ${target.isFromContract ? 'text-black' : 'text-white'}`}>{target.name}</h3>
                          {target.isFromContract && (
                            <div className="badge badge-accent badge-outline bg-white/10 border-white/30 text-black">
                              🔗 Smart Contract
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`badge badge-${getStatusColor(target.status)} badge-outline bg-white/10 border-white/30 ${target.isFromContract ? 'text-black' : 'text-white'}`}>
                            {target.status === 'active' ? '🎯' : 
                             target.status === 'closed' ? '🔒' : 
                             target.status === 'completed' ? '✅' : '❌'} {target.status}
                          </div>
                          <div className={`badge badge-success badge-outline bg-white/10 border-white/30 ${target.isFromContract ? 'text-black' : 'text-white'}`}>
                            {Object.keys(target.metrics).length} metrics
                          </div>
                          <div className={`badge badge-success badge-outline bg-white/10 border-white/30 ${target.isFromContract ? 'text-black' : 'text-white'}`}>
                            📅 {new Date(target.deadline).toLocaleDateString()}
                          </div>
                          {target.betId && (
                            <div className="badge badge-accent badge-outline bg-white/10 border-white/30 text-black">
                              🎲 Bet #{target.betId}
                            </div>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed mb-3 ${target.isFromContract ? 'text-black/90' : 'text-white/90'}`}>{target.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className={`flex justify-between text-xs mb-1 ${target.isFromContract ? 'text-black/80' : 'text-white/80'}`}>
                            <span>{target.isFromContract ? 'Betting Pool' : 'Progress'}</span>
                            <span>
                              {target.isFromContract 
                                ? `${target.progress}% betting FOR` 
                                : `${target.progress}%`
                              }
                            </span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                target.isFromContract ? 'bg-green-400' : 'bg-white'
                              }`}
                              style={{ width: `${target.progress}%` }}
                            ></div>
                          </div>
                          {target.isFromContract && (
                            <div className="flex justify-between text-xs text-black/60 mt-1">
                              <span>FOR: {target.progress}%</span>
                              <span>AGAINST: {100 - target.progress}%</span>
                            </div>
                          )}
                        </div>

                        {/* Show actual results for completed contract bets */}
                        {target.isFromContract && target.status !== 'active' && target.actualSteps && (
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/20">
                            <div className="text-black/80 text-sm font-medium mb-1">Final Results</div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🚶</span>
                                <span className="text-black">
                                  {target.actualSteps.toLocaleString()} steps achieved
                                </span>
                              </div>
                              <div className={`badge ${target.goalAchieved ? 'badge-success' : 'badge-error'} text-black`}>
                                {target.goalAchieved ? '✅ Goal Met' : '❌ Goal Missed'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(target.metrics).map(([key, value]) => {
                        const metricInfo = metricLabels[key];
                        if (!metricInfo) return null;
                        
                        return (
                          <div key={key} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{metricInfo.icon}</span>
                              <span className={`text-sm font-medium ${target.isFromContract ? 'text-black/80' : 'text-white/80'}`}>{metricInfo.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-2xl font-bold ${target.isFromContract ? 'text-black' : 'text-white'}`}>
                                {formatMetricValue(key, value)}
                              </span>
                              {metricInfo.unit && (
                                <span className={`text-xs ${target.isFromContract ? 'text-black/60' : 'text-white/60'}`}>{metricInfo.unit}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Action Area */}
                  <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[120px]">
                    <button className={`btn ${target.isFromContract ? 'btn-primary' : 'btn-success'} bg-white/20 border-white/30 hover:bg-white/30 ${target.isFromContract ? 'text-black' : 'text-white'} flex-1 lg:flex-none`}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Track
                    </button>
                    <button className={`btn btn-outline border-white/30 hover:bg-white/10 flex-1 lg:flex-none ${target.isFromContract ? 'text-black' : 'text-white'}`}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Details
                    </button>
                    
                    {target.isFromContract && target.betId && isConnected && (
                      <>
                        {target.status === 'active' && (
                          <div className="flex flex-col gap-2 lg:flex-none">
                            <button 
                              className="btn btn-accent bg-white/20 border-white/30 hover:bg-white/30 text-black text-xs px-2"
                              onClick={() => handlePlaceBet(target.betId!, true, "50000000000000000")} // 0.05 ETH
                            >
                              Bet For 0.05Ξ
                            </button>
                            <button 
                              className="btn btn-warning bg-white/20 border-white/30 hover:bg-white/30 text-black text-xs px-2"
                              onClick={() => handlePlaceBet(target.betId!, false, "50000000000000000")} // 0.05 ETH
                            >
                              Bet Against 0.05Ξ
                            </button>
                          </div>
                        )}
                        
                        {target.status === 'active' && (
                          /* Close Bet Button */
                          <button
                            className="btn btn-error bg-white/20 border-white/30 hover:bg-white/30 text-black text-xs px-2"
                            onClick={() => handleCloseBet(target.betId!)}
                            disabled={isClosingBet === target.betId}
                          >
                            {isClosingBet === target.betId ? "Closing..." : "Close Bet"}
                          </button>
                        )}
                        
                        {(target.status === 'closed' || target.status === 'active') && (
                          /* Resolve Bet Button */
                          <button
                            className="btn btn-info bg-white/20 border-white/30 hover:bg-white/30 text-black text-xs px-2"
                            onClick={() => openResolveModal(target.betId!, target.deadline)}
                            disabled={isResolvingBet === target.betId}
                          >
                            {isResolvingBet === target.betId ? "Resolving..." : "Resolve Bet"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTargets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">No targets found</h3>
            <p className="text-base-content/70 mb-4">
              {searchTerm || selectedMetricFilter || statusFilter
                ? "Try adjusting your search or filters" 
                : "Create your first target to get started"}
            </p>
            {(searchTerm || selectedMetricFilter || statusFilter) && (
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMetricFilter("");
                  setStatusFilter("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <CreateTargetModal onCreateTarget={handleCreateTarget} />

      {/* Resolve Bet Modal */}
      <dialog id="resolve_bet_modal" className="modal">
        <div className="modal-box max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Resolve Bet #{resolveModalBetId}</h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={closeResolveModal}
              disabled={isResolvingBet === resolveModalBetId}
            >
              ✕
            </button>
          </div>

          <div className="text-sm text-base-content/70 mb-6">
            <p>Generate a web proof to resolve the bet for {resolveModalTargetDate}. This will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Open Garmin Connect daily data page</li>
              <li>Generate a proof of your step count</li>
              <li>Resolve the bet and distribute winnings</li>
            </ul>
          </div>

          {/* User UUID Info */}
          {userUuid && (
            <div className="bg-base-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-base-content/70 mb-1">Connected Garmin UUID:</p>
              <code className="text-primary font-mono text-sm">{userUuid}</code>
            </div>
          )}

          <button
            onClick={handleResolveBet}
            disabled={!userUuid || isResolvingBet === resolveModalBetId || !isConnected}
            className={`btn w-full mb-4 ${
              !userUuid || isResolvingBet === resolveModalBetId || !isConnected
                ? "btn-disabled"
                : "btn-primary"
            }`}
          >
            {!isConnected
              ? "Connect Wallet to Continue"
              : !userUuid
              ? "Register Garmin UUID First"
              : isResolvingBet === resolveModalBetId
              ? "Generating Proof..."
              : "Generate Proof"}
          </button>

          {!userUuid && (
            <div className="alert alert-warning mb-4">
              <span className="text-sm">You need to register your Garmin UUID first to resolve bets.</span>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
} 