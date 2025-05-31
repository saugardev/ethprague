"use client";

import { useState, useMemo } from "react";
import Hero from "@/components/hero";
import CreateGroupModal from "@/components/CreateGroupModal";

interface Group {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  memberCount: number;
}

const metricLabels: Record<string, { label: string; icon: string; unit: string }> = {
  sleepScore: { label: "Sleep Score", icon: "😴", unit: "" },
  steps: { label: "Steps", icon: "🚶", unit: "" },
  caloriesBurned: { label: "Calories", icon: "🔥", unit: "" },
  fitnessAge: { label: "Fitness Age", icon: "💪", unit: "" },
  heartRate: { label: "Heart Rate", icon: "❤️", unit: "bpm" },
  workoutMinutes: { label: "Workout", icon: "🏋️", unit: "min/week" }
};

export default function Groups() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetricFilter, setSelectedMetricFilter] = useState("");

  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Early Birds",
      description: "For those who wake up early and maintain excellent sleep habits",
      metrics: {
        sleepScore: 85,
        steps: 12000,
        caloriesBurned: 600
      },
      memberCount: 42
    },
    {
      id: "2", 
      name: "Step Masters",
      description: "High-activity group for people who love walking and running",
      metrics: {
        steps: 15000,
        caloriesBurned: 800,
        workoutMinutes: 200
      },
      memberCount: 38
    },
    {
      id: "3",
      name: "Heart Health Focus",
      description: "Dedicated to cardiovascular health and heart rate optimization",
      metrics: {
        heartRate: 65,
        workoutMinutes: 150,
        fitnessAge: 25
      },
      memberCount: 29
    },
    {
      id: "4",
      name: "Marathon Trainers",
      description: "Elite runners preparing for marathons and long-distance events",
      metrics: {
        steps: 20000,
        caloriesBurned: 1200,
        heartRate: 55,
        workoutMinutes: 300
      },
      memberCount: 18
    },
    {
      id: "5",
      name: "Sleep Warriors",
      description: "Optimizing sleep quality and recovery for peak performance",
      metrics: {
        sleepScore: 92,
        heartRate: 58,
        fitnessAge: 22
      },
      memberCount: 35
    }
  ]);

  const handleCreateGroup = (groupData: Omit<Group, 'id' | 'memberCount'>) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      ...groupData,
      memberCount: 1
    };
    setGroups([...groups, newGroup]);
  };

  const formatMetricValue = (key: string, value: number) => {
    if (key === 'steps' || key === 'caloriesBurned') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  // Get all unique metrics across all groups
  const availableMetrics = useMemo(() => {
    const allMetrics = new Set<string>();
    groups.forEach(group => {
      Object.keys(group.metrics).forEach(metric => allMetrics.add(metric));
    });
    return Array.from(allMetrics).map(metric => ({
      key: metric,
      label: metricLabels[metric]?.label || metric
    }));
  }, [groups]);

  // Filter groups based on search and metric filter
  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMetric = !selectedMetricFilter || 
                           group.metrics.hasOwnProperty(selectedMetricFilter);
      
      return matchesSearch && matchesMetric;
    });
  }, [groups, searchTerm, selectedMetricFilter]);

  return (
    <>
      <Hero 
        title="Health & Fitness Groups"
        subtitle="Join communities based on your health metrics and fitness goals."
        showCta={false}
      />

      <div className="mt-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
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
                <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
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

            {/* Create Group Button */}
            <button 
              className="btn btn-success px-6"
              onClick={() => {
                const modal = document.getElementById('create_group_modal') as HTMLDialogElement;
                modal?.showModal();
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Group
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-base-content/70 mb-4">
          {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''} found
        </div>

        <div className="grid gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="card bg-gradient-to-br from-success to-success/80 text-success-content shadow-xl hover:shadow-2xl transition-all duration-300 border border-success/20">
              <div className="card-body p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="card-title text-xl text-white mb-2">{group.name}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            {group.memberCount} members
                          </div>
                          <div className="badge badge-success badge-outline bg-white/10 border-white/30 text-white">
                            {Object.keys(group.metrics).length} metrics
                          </div>
                        </div>
                        <p className="text-white/90 text-sm leading-relaxed">{group.description}</p>
                      </div>
                    </div>
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(group.metrics).map(([key, value]) => {
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Join
                    </button>
                    <button className="btn btn-outline border-white/30 text-white hover:bg-white/10 flex-1 lg:flex-none">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Info
                    </button>
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
    </>
  );
} 