"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserStrategy, useSetStrategy, type RiskLevel, DURATION_OPTIONS } from "@/lib/hooks/useRiskRegistry";
import { useHydrated } from "@/lib/hooks/useHydrated";

const levels = [
  {
    id: "conservative" as const,
    label: "Conservative",
    hint: "40% allocation, lower risk exposure",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    hint: "60% allocation, moderate risk (recommended)",
  },
  {
    id: "aggressive" as const,
    label: "Aggressive",
    hint: "80% allocation, maximum yield seeking",
  },
];

export function RiskAndFees() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { riskLevel: savedRisk, duration } = useUserStrategy(hydrated ? address : undefined);
  const { setStrategy, isLoading, error, success } = useSetStrategy();
  
  const [risk, setRisk] = useState<RiskLevel>(savedRisk);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const handleRiskChange = async (newRisk: RiskLevel) => {
    setRisk(newRisk);
    setLocalSuccess(false);
    
    try {
      await setStrategy(newRisk, duration);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update risk:", err);
    }
  };

  return (
    <div className="surface-card h-full flex flex-col p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-brand-black">Risk level</h3>
          <p className="mt-1 text-xs text-neutral-600">
            Allocation percentage controls yield/volatility.
          </p>
        </div>
        <span
          className="flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border border-brand-gray bg-brand-bg text-[10px] font-bold text-neutral-600"
          title="Conservative = safer but lower yield. Aggressive = higher yield potential but more rebalancing activity."
        >
          ?
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => handleRiskChange(l.id)}
            disabled={isLoading}
            className={`flex-1 rounded-xl border px-3 py-2 text-left text-xs transition duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
              risk === l.id
                ? "border-brand-green bg-brand-green/10 text-brand-black"
                : "border-brand-gray/80 bg-white text-neutral-600 hover:border-brand-gray"
            }`}
          >
            <span className="text-sm font-semibold block">{l.label}</span>
            <span className="mt-0.5 block text-[10px] leading-tight text-neutral-500">
              {l.hint.split(",")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Status Messages */}
      <div className="mt-3 min-h-[1.25rem]">
        {isLoading && (
          <p className="text-xs text-neutral-600 animate-pulse">
            Updating...
          </p>
        )}
        {error && (
          <p className="text-xs text-red-600">
            ✗ {error}
          </p>
        )}
        {(success || localSuccess) && (
          <p className="text-xs text-brand-green font-medium">
            ✓ Updated
          </p>
        )}
      </div>

      <div className="mt-auto border-t border-brand-gray/60 pt-4">
        <p className="text-xs leading-relaxed text-neutral-600">
          <span className="font-semibold text-brand-black">Fee:</span> 0.5% on yield only. No deposit/withdrawal fees.
        </p>
      </div>
    </div>
  );
}
