"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Group {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, number>;
  memberCount: number;
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

interface CreateGroupModalProps {
  onCreateGroup: (group: Omit<Group, 'id' | 'memberCount'>) => void;
}

export default function CreateGroupModal({ onCreateGroup }: CreateGroupModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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
    },
    {
      key: "countOfActivities",
      label: "Activity Count (Onchain)",
      placeholder: "10",
      unit: "verified activities",
      min: 1,
      max: 1000,
      icon: "📊"
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

    onCreateGroup({
      name: formData.name,
      description: formData.description,
      metrics
    });
    
    // Reset form and close modal
    setFormData({ name: "", description: "" });
    setSelectedMetrics([]);
    setMetricValues({});
    setCurrentStep(1);
    const modal = document.getElementById('create_group_modal') as HTMLDialogElement;
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

  const isStep1Valid = formData.name.trim() !== "" && formData.description.trim() !== "";
  const isStep2Valid = selectedMetrics.length > 0;
  const isStep3Valid = selectedMetrics.every(metric => metricValues[metric] && metricValues[metric].trim() !== "");

  return (
    <dialog id="create_group_modal" className="modal">
      <div className="modal-box max-w-md">
        <form method="dialog">
          <button className="btn btn-xs btn-circle btn-ghost absolute right-6.5 top-6.5">✕</button>
        </form>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Create New Group</h3>
          
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
                    <p className="text-sm text-base-content/70">Tell us about your group</p>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Group Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter group name"
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
                      placeholder="Describe your group&apos;s goals and activities"
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
                    <h4 className="text-lg font-semibold">Select Metrics</h4>
                    <p className="text-sm text-base-content/70">Choose which health metrics to track</p>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                    <div className="grid grid-cols-1 gap-2 pr-2">
                      {availableMetrics.map((metric) => (
                        <div
                          key={metric.key}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedMetrics.includes(metric.key)
                              ? 'border-success bg-success/10 text-success'
                              : 'border-base-300 hover:border-base-400'
                          }`}
                          onClick={() => toggleMetric(metric.key)}
                        >
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
              )}

              {currentStep === 3 && (
                <div className="flex flex-col h-full">
                  <div className="text-center mb-4 flex-shrink-0">
                    <h4 className="text-lg font-semibold">Set Target Values</h4>
                    <p className="text-sm text-base-content/70">Define your group&apos;s goals</p>
                  </div>

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
              className={`btn btn-success ${!isStep3Valid ? 'btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={!isStep3Valid}
            >
              Create Group
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
} 