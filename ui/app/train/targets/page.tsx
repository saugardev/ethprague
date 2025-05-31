"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Abi } from "viem";
import Hero from "@/components/hero";
import CreateTargetModal from "@/components/CreateTargetModal";
import webProofVerifier from "../../../../contracts/out/WebProofVerifier.sol/WebProofVerifier.json";

const verifierAbi = webProofVerifier.abi as Abi;

interface Target {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
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

  const { writeContract } = useWriteContract();

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

  // Fetch active bets from contract
  const { data: activeBetIds, refetch: refetchActiveBets } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getActiveBets",
    query: {
      enabled: isConnected,
    },
  }) as { data: bigint[] | undefined; refetch: () => void };

  // Fetch details for the first active bet (we'll expand this later for multiple bets)
  const firstBetId = activeBetIds && activeBetIds.length > 0 ? activeBetIds[0] : null;
  
  const { data: firstBetData, refetch: refetchBetData } = useReadContract({
    address: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS as `0x${string}`,
    abi: verifierAbi,
    functionName: "getBet",
    args: firstBetId ? [firstBetId] : undefined,
    query: {
      enabled: isConnected && !!firstBetId,
    },
  });

  // Convert contract bets to Target format
  const contractTargets: Target[] = useMemo(() => {
    if (!firstBetData || !firstBetId) return [];
    
    const betData = firstBetData as {
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

    // Calculate bet pool percentage (% betting FOR)
    const totalPool = Number(betData.totalPoolFor) + Number(betData.totalPoolAgainst);
    const forPercentage = totalPool > 0 ? Math.round((Number(betData.totalPoolFor) / totalPool) * 100) : 50;

    return [{
      id: `contract-${Number(firstBetId)}`,
      name: `Step Challenge #${Number(firstBetId)}`,
      description: `Achieve ${Number(betData.minimumSteps).toLocaleString()} steps by ${betData.targetDate}`,
      metrics: {
        steps: Number(betData.minimumSteps)
      },
      deadline: betData.targetDate,
      status: betData.status === 0 ? 'active' as const : betData.status === 2 ? 
        (betData.goalAchieved ? 'completed' as const : 'failed' as const) : 'active' as const,
      progress: betData.status === 2 ? 
        (betData.goalAchieved ? 100 : 0) : 
        forPercentage,
      isFromContract: true,
      betId: Number(firstBetId),
      actualSteps: betData.actualSteps ? Number(betData.actualSteps) : undefined,
      goalAchieved: betData.goalAchieved
    }];
  }, [firstBetData, firstBetId]);

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
                            {target.status === 'active' ? '🎯' : target.status === 'completed' ? '✅' : '❌'} {target.status}
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
                    {target.isFromContract && target.status === 'active' && target.betId && isConnected && (
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
    </>
  );
} 