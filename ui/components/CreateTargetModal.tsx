"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";

interface Target {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
}

interface MetricOption {
  key: string;
  label: string;
  placeholder: string;
  unit: string;
  min: number;
  max?: number;
  icon: string;
}

interface CreateTargetModalProps {
  onCreateTarget: (target: Omit<Target, 'id' | 'status' | 'progress'>) => void;
}

export default function CreateTargetModal({ onCreateTarget }: CreateTargetModalProps) {
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: ""
  });

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});

  const availableMetrics: MetricOption[] = [
    {
      key: "sleepScore",
      label: "Sleep Score",
      placeholder: "85",
      unit: "0-100",
      min: 0,
      max: 100,
      icon: "😴"
    },
    {
      key: "steps",
      label: "Daily Steps",
      placeholder: "10000",
      unit: "steps/day",
      min: 0,
      icon: "🚶"
    },
    {
      key: "caloriesBurned",
      label: "Calories Burned",
      placeholder: "500",
      unit: "calories/day",
      min: 0,
      icon: "🔥"
    },
    {
      key: "fitnessAge",
      label: "Fitness Age",
      placeholder: "25",
      unit: "years",
      min: 18,
      max: 80,
      icon: "💪"
    },
    {
      key: "heartRate",
      label: "Resting Heart Rate",
      placeholder: "65",
      unit: "bpm",
      min: 40,
      max: 120,
      icon: "❤️"
    },
    {
      key: "workoutMinutes",
      label: "Weekly Workout",
      placeholder: "150",
      unit: "minutes/week",
      min: 0,
      icon: "🏋️"
    }
  ];

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleMetric = (metricKey: string) => {
    if (selectedMetrics.includes(metricKey)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricKey));
      const newValues = { ...metricValues };
      delete newValues[metricKey];
      setMetricValues(newValues);
    } else {
      setSelectedMetrics([...selectedMetrics, metricKey]);
    }
  };

  const updateMetricValue = (metricKey: string, value: string) => {
    setMetricValues({
      ...metricValues,
      [metricKey]: value
    });
  };

  const handleSubmit = () => {
    const metrics: Record<string, number> = {};
    selectedMetrics.forEach(metricKey => {
      const value = metricValues[metricKey];
      if (value) {
        metrics[metricKey] = parseInt(value);
      }
    });

    onCreateTarget({
      name: formData.name,
      description: formData.description,
      deadline: formData.deadline,
      metrics
    });
    
    // Reset form and close modal
    setFormData({ name: "", description: "", deadline: "" });
    setSelectedMetrics([]);
    setMetricValues({});
    setCurrentStep(1);
    const modal = document.getElementById('create_target_modal') as HTMLDialogElement;
    modal?.close();
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const stepTransition = {
    x: { type: "spring", stiffness: 300, damping: 30 },
    opacity: { duration: 0.2 }
  };

  // Check if this target will create a smart contract bet
  const willCreateBet = selectedMetrics.includes("steps") && isConnected;
  const stepsValue = metricValues["steps"] ? parseInt(metricValues["steps"]) : 0;

  const isStep1Valid = formData.name.trim() !== "" && formData.description.trim() !== "";
  const isStep2Valid = selectedMetrics.length > 0 && formData.deadline.trim() !== "";
  const isStep3Valid = selectedMetrics.every(metric => metricValues[metric] && metricValues[metric].trim() !== "");

  return (
    <dialog id="create_target_modal" className="modal">
      <div className="modal-box max-w-md">
        <form method="dialog">
          <button className="btn btn-xs btn-circle btn-ghost absolute right-6.5 top-6.5">✕</button>
        </form>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Create New Target</h3>
          
          {/* Smart Contract Integration Notice */}
          {willCreateBet && (
            <div className="alert alert-success mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-semibold">🔗 Smart Contract Target</div>
                <div className="text-sm">This will create a step bet on the blockchain with 0.1 ETH stake!</div>
              </div>
            </div>
          )}

          {!isConnected && selectedMetrics.includes("steps") && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div>
                <div className="font-semibold">Connect Wallet</div>
                <div className="text-sm">Connect your wallet to create step-based targets with betting!</div>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step <= currentStep ? 'bg-success text-success-content' : 'bg-base-300 text-base-content'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-34 h-0.5 mx-2 transition-colors ${
                    step < currentStep ? 'bg-success' : 'bg-base-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden px-1">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="space-y-4 px-1 h-72 flex flex-col"
            >
              {currentStep === 1 && (
                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-semibold">Basic Information</h4>
                    <p className="text-sm text-base-content/70">Tell us about your target</p>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Target Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter target name"
                      className="input input-bordered w-full focus:input-success focus:outline-offset-0 rounded-md"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Description</span>
                    </label>
                    <textarea
                      placeholder="Describe your target goals and objectives"
                      className="textarea textarea-bordered w-full h-24 resize-none focus:textarea-success focus:outline-offset-0 rounded-md"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex flex-col h-full">
                  <div className="text-center mb-4 flex-shrink-0">
                    <h4 className="text-lg font-semibold">Metrics & Deadline</h4>
                    <p className="text-sm text-base-content/70">Choose metrics and set your deadline</p>
                  </div>

                  <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    {/* Date Picker */}
                    <div className="form-control w-full flex-shrink-0">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <span>📅</span>
                          Deadline
                        </span>
                      </label>
                      <input
                        type="date"
                        className="input input-bordered w-full focus:input-success focus:outline-offset-0 rounded-md"
                        value={formData.deadline}
                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {/* Metrics Selection */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <label className="label">
                        <span className="label-text font-medium">Select Metrics</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2 pr-2">
                        {availableMetrics.map((metric) => (
                          <div
                            key={metric.key}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all relative ${
                              selectedMetrics.includes(metric.key)
                                ? 'border-success bg-success/10 text-success'
                                : 'border-base-300 hover:border-base-400'
                            }`}
                            onClick={() => toggleMetric(metric.key)}
                          >
                            {metric.key === "steps" && (
                              <div className="absolute top-1 right-1">
                                <div className="badge badge-primary badge-xs">
                                  🔗 Smart Contract
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{metric.icon}</span>
                                <div>
                                  <div className="font-medium">{metric.label}</div>
                                  <div className="text-xs text-base-content/50">{metric.unit}</div>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedMetrics.includes(metric.key)
                                  ? 'border-success bg-success'
                                  : 'border-base-300'
                              }`}>
                                {selectedMetrics.includes(metric.key) && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedMetrics.length > 0 && (
                      <div className="text-center text-sm text-success flex-shrink-0">
                        {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col h-full">
                  <div className="text-center mb-4 flex-shrink-0">
                    <h4 className="text-lg font-semibold">Set Target Values</h4>
                    <p className="text-sm text-base-content/70">Define your target goals</p>
                  </div>

                  {/* Smart Contract Bet Summary */}
                  {willCreateBet && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex-shrink-0">
                      <div className="text-primary font-semibold text-sm mb-1">Bet Summary</div>
                      <div className="text-xs text-base-content/70">
                        Goal: {stepsValue.toLocaleString()} steps by {formData.deadline}
                      </div>
                      <div className="text-xs text-base-content/70">
                        Stake: 0.1 ETH • Others can bet for/against your goal
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                    {selectedMetrics.map((metricKey) => {
                      const metric = availableMetrics.find(m => m.key === metricKey);
                      if (!metric) return null;

                      return (
                        <div key={metricKey} className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-medium flex items-center gap-2">
                              <span>{metric.icon}</span>
                              {metric.label}
                              {metricKey === "steps" && isConnected && (
                                <div className="badge badge-primary badge-xs">Blockchain</div>
                              )}
                            </span>
                            <span className="label-text-alt text-base-content/50">{metric.unit}</span>
                          </label>
                          <input
                            type="number"
                            placeholder={metric.placeholder}
                            className="input input-bordered w-full focus:input-success focus:outline-offset-0 rounded-md"
                            min={metric.min}
                            max={metric.max}
                            value={metricValues[metricKey] || ""}
                            onChange={(e) => updateMetricValue(metricKey, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="modal-action mt-6">
          {currentStep > 1 && (
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={handlePrev}
            >
              Previous
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button 
              type="button" 
              className={`btn btn-success ${
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid) 
                  ? 'btn-disabled' : ''
              }`}
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid)
              }
            >
              Next
            </button>
          ) : (
            <button 
              type="button" 
              className={`btn ${willCreateBet ? 'btn-primary' : 'btn-success'} ${!isStep3Valid ? 'btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={!isStep3Valid}
            >
              {willCreateBet ? 'Create Bet (0.1 ETH)' : 'Create Target'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
} 