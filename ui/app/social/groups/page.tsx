"use client";

import { useState } from "react";
import Hero from "@/components/hero";

interface Group {
  id: string;
  name: string;
  description: string;
  sleepScore: number;
  steps: number;
  caloriesBurned: number;
  fitnessAge: number;
  memberCount: number;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Early Birds",
      description: "For those who wake up early and maintain excellent sleep habits",
      sleepScore: 85,
      steps: 12000,
      caloriesBurned: 600,
      fitnessAge: 25,
      memberCount: 42
    },
    {
      id: "2", 
      name: "Step Masters",
      description: "High-activity group for people who love walking and running",
      sleepScore: 75,
      steps: 15000,
      caloriesBurned: 800,
      fitnessAge: 28,
      memberCount: 38
    }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sleepScore: "",
    steps: "",
    caloriesBurned: "",
    fitnessAge: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGroup: Group = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      sleepScore: parseInt(formData.sleepScore),
      steps: parseInt(formData.steps),
      caloriesBurned: parseInt(formData.caloriesBurned),
      fitnessAge: parseInt(formData.fitnessAge),
      memberCount: 1
    };
    setGroups([...groups, newGroup]);
    setFormData({
      name: "",
      description: "",
      sleepScore: "",
      steps: "",
      caloriesBurned: "",
      fitnessAge: ""
    });
    // Close modal
    const modal = document.getElementById('create_group_modal') as HTMLDialogElement;
    modal?.close();
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
            className="btn btn-primary"
            onClick={() => {
              const modal = document.getElementById('create_group_modal') as HTMLDialogElement;
              modal?.showModal();
            }}
          >
            +
          </button>
        </div>

        <div className="grid gap-4">
          {groups.map((group) => (
            <div key={group.id} className="card bg-success text-success-content shadow-md">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="card-title text-white">{group.name}</h3>
                    <p className="text-white/80 mb-4">{group.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="stat">
                        <div className="stat-title text-white/70">Sleep Score</div>
                        <div className="stat-value text-lg text-white">{group.sleepScore}</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title text-white/70">Steps</div>
                        <div className="stat-value text-lg text-white">{group.steps.toLocaleString()}</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title text-white/70">Calories</div>
                        <div className="stat-value text-lg text-white">{group.caloriesBurned}</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title text-white/70">Fitness Age</div>
                        <div className="stat-value text-lg text-white">{group.fitnessAge}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
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

      {/* Create Group Modal */}
      <dialog id="create_group_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          
          <h3 className="text-lg mb-4">Create New Group</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter group name"
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                placeholder="Describe your group"
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Sleep Score</span>
                </label>
                <input
                  type="number"
                  placeholder="0-100"
                  className="input input-bordered"
                  min="0"
                  max="100"
                  value={formData.sleepScore}
                  onChange={(e) => setFormData({...formData, sleepScore: e.target.value})}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Daily Steps</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 10000"
                  className="input input-bordered"
                  min="0"
                  value={formData.steps}
                  onChange={(e) => setFormData({...formData, steps: e.target.value})}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Calories Burned</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 500"
                  className="input input-bordered"
                  min="0"
                  value={formData.caloriesBurned}
                  onChange={(e) => setFormData({...formData, caloriesBurned: e.target.value})}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fitness Age</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 25"
                  className="input input-bordered"
                  min="18"
                  max="80"
                  value={formData.fitnessAge}
                  onChange={(e) => setFormData({...formData, fitnessAge: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="modal-action">
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
} 