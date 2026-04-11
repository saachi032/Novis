"use client";

import { useState, useEffect } from "react";
import { useSetInvestmentStrategy, useInvestmentSettings, type RiskLevel, type DurationKey, RISK_PERCENTAGES, DURATION_OPTIONS } from "@/lib/hooks/useInvestmentStrategy";

const riskLevels = [
  { id: "conservative" as const, label: "Conservative", hint: "40% - Low Risk" },
  { id: "balanced" as const, label: "Balanced", hint: "60% - Moderate Risk" },
  { id: "aggressive" as const, label: "Aggressive", hint: "80% - High Risk" },
];

const durations = [
  { id: "daily" as const, label: "Daily", hint: "Check every 24h" },
  { id: "weekly" as const, label: "Weekly", hint: "Check every 7 days" },
  { id: "monthly" as const, label: "Monthly", hint: "Check every 30 days" },
  { id: "quarterly" as const, label: "Quarterly", hint: "Check every 90 days" },
  { id: "halfYearly" as const, label: "Half-Yearly", hint: "Check every 180 days" },
];

interface InvestmentStrategyPanelProps {
  investmentId: string;
  investmentName: string;
}

export function InvestmentStrategyPanel({
  investmentId,
  investmentName,
}: InvestmentStrategyPanelProps) {
  const { risk, duration, loadSettings, saveSettings } = useInvestmentSettings(investmentId);
  const { setInvestmentStrategy } = useSetInvestmentStrategy();

  const [localRisk, setLocalRisk] = useState<RiskLevel>(risk);
  const [localDuration, setLocalDuration] = useState<DurationKey>(duration);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleApplyStrategy = async () => {
    setIsLoading(true);
    try {
      await setInvestmentStrategy(investmentId, localRisk, localDuration);
      saveSettings(localRisk, localDuration);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update investment strategy:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl p-5 border border-brand-gray/40">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-brand-black">{investmentName}</h4>
          <p className="mt-1 text-xs text-neutral-600">
            Configure risk profile and rebalance frequency for this investment
          </p>
        </div>
      </div>

      {/* Risk Level Section */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-neutral-700 mb-2">Risk Level</p>
        <div className="grid grid-cols-3 gap-2">
          {riskLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setLocalRisk(level.id)}
              disabled={isLoading}
              className={`rounded-lg border px-3 py-2.5 text-xs transition ${
                localRisk === level.id
                  ? "border-brand-green bg-brand-green/10 text-brand-black font-semibold"
                  : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"
              } disabled:opacity-50`}
            >
              <div className="font-semibold">{level.label}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{level.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration Section */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-neutral-700 mb-2">Check Frequency</p>
        <div className="grid grid-cols-5 gap-2">
          {durations.map((dur) => (
            <button
              key={dur.id}
              onClick={() => setLocalDuration(dur.id)}
              disabled={isLoading}
              className={`rounded-lg border px-2.5 py-2 text-xs transition ${
                localDuration === dur.id
                  ? "border-brand-green bg-brand-green/10 text-brand-black font-semibold"
                  : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"
              } disabled:opacity-50`}
            >
              <div className="font-semibold text-[11px]">{dur.label}</div>
              <div className="text-[9px] text-neutral-500 mt-0.5">{dur.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      <div className="mb-3 min-h-[1.5rem]">
        {isLoading && (
          <p className="text-xs text-blue-600 animate-pulse">Updating strategy...</p>
        )}
        {showSuccess && (
          <p className="text-xs text-brand-green">Strategy saved successfully</p>
        )}
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApplyStrategy}
        disabled={
          isLoading ||
          (localRisk === risk && localDuration === duration)
        }
        className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-green/90 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Apply Strategy"}
      </button>

      {/* Current Settings */}
      <div className="mt-3 rounded-lg bg-brand-bg/50 p-3 text-xs">
        <p className="text-neutral-600">
          <span className="font-semibold">Current:</span> {localRisk} risk, {localDuration} checks
        </p>
      </div>
    </div>
  );
}
