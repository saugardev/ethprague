"use client";

import { useState, useMemo } from "react";
import Hero from "@/components/hero";
import CreateTargetModal from "@/components/CreateTargetModal";

interface Target {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetricFilter, setSelectedMetricFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [targets, setTargets] = useState<Target[]>([
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

  const handleCreateTarget = (targetData: Omit<Target, 'id' | 'status' | 'progress'>) => {
    const newTarget: Target = {
      id: Date.now().toString(),
      ...targetData,
      status: 'active',
      progress: 0
    };
    setTargets([...targets, newTarget]);
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
    targets.forEach(target => {
      Object.keys(target.metrics).forEach(metric => allMetrics.add(metric));
    });
    return Array.from(allMetrics).map(metric => ({
      key: metric,
      label: metricLabels[metric]?.label || metric
    }));
  }, [targets]);

  // Filter targets based on search, metric filter, and status filter
  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const matchesSearch = target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           target.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMetric = !selectedMetricFilter || 
                           target.metrics.hasOwnProperty(selectedMetricFilter);
      
      const matchesStatus = !statusFilter || target.status === statusFilter;
      
      return matchesSearch && matchesMetric && matchesStatus;
    });
  }, [targets, searchTerm, selectedMetricFilter, statusFilter]);

  return (
    <>
      <Hero 
        title="Training Targets"
        subtitle="Set measurable fitness goals using sleep, steps, heart rate, and more."
        showCta={false}
      />

      <div className="mt-8">
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
        </div>

        <div className="grid gap-6">
          {filteredTargets.map((target) => (
            <div key={target.id} className="card bg-gradient-to-br from-success to-success/80 text-success-content shadow-xl hover:shadow-2xl transition-all duration-300 border border-success/20">
              <div className="card-body p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="card-title text-xl text-white mb-2">{target.name}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`badge badge-${getStatusColor(target.status)} badge-outline bg-white/10 border-white/30 text-white`}>
                            {target.status === 'active' ? '🎯' : target.status === 'completed' ? '✅' : '❌'} {target.status}
                          </div>
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            {Object.keys(target.metrics).length} metrics
                          </div>
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            📅 {new Date(target.deadline).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed mb-3">{target.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-white/80 mb-1">
                            <span>Progress</span>
                            <span>{target.progress}%</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div 
                              className="bg-white h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${target.progress}%` }}
                            ></div>
                          </div>
                        </div>
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
                              <span className="text-white/80 text-sm font-medium">{metricInfo.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-white">
                                {formatMetricValue(key, value)}
                              </span>
                              {metricInfo.unit && (
                                <span className="text-white/60 text-xs">{metricInfo.unit}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Action Area */}
                  <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[120px]">
                    <button className="btn btn-success bg-white/20 border-white/30 hover:bg-white/30 text-white flex-1 lg:flex-none">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Track
                    </button>
                    <button className="btn btn-outline border-white/30 text-white hover:bg-white/10 flex-1 lg:flex-none">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Details
                    </button>
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