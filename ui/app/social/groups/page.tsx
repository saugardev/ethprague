"use client";

import { useState } from "react";
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

  return (
    <>
      <Hero 
        title="Health & Fitness Groups"
        subtitle="Join communities based on your health metrics and fitness goals."
        showCta={false}
      />

      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl">Your Groups</h2>
          <button 
            className="btn btn-success"
            onClick={() => {
              const modal = document.getElementById('create_group_modal') as HTMLDialogElement;
              modal?.showModal();
            }}
          >
            + Create Group
          </button>
        </div>

        <div className="grid gap-4">
          {groups.map((group) => (
            <div key={group.id} className="card bg-success text-success-content shadow-md">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="card-title text-white">{group.name}</h3>
                    <p className="text-white/80 mb-4">{group.description}</p>
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      {Object.entries(group.metrics).map(([key, value]) => {
                        const metricInfo = metricLabels[key];
                        if (!metricInfo) return null;
                        
                        return (
                          <div key={key} className="stat min-w-0">
                            <div className="stat-title text-white/70 flex items-center gap-1">
                              <span>{metricInfo.icon}</span>
                              {metricInfo.label}
                            </div>
                            <div className="stat-value text-lg text-white">
                              {formatMetricValue(key, value)}
                              {metricInfo.unit && <span className="text-sm ml-1">{metricInfo.unit}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="badge badge-outline border-white text-white">{group.memberCount} members</div>
                    <div className="mt-4">
                      <button className="btn btn-success btn-soft">Join</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateGroupModal onCreateGroup={handleCreateGroup} />
    </>
  );
} 