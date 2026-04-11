"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserStrategy, useSetStrategy, DURATION_OPTIONS, type DurationKey } from "@/lib/hooks/useRiskRegistry";
import { useHydrated } from "@/lib/hooks/useHydrated";

const durations = [
  {
    id: "daily" as const,
    label: "Daily",
    hint: "Check every 24 hours",
  },
  {
    id: "weekly" as const,
    label: "Weekly",
    hint: "Check every 7 days (recommended)",
  },
  {
    id: "monthly" as const,
    label: "Monthly",
    hint: "Check every 30 days",
  },
  {
    id: "quarterly" as const,
    label: "Quarterly",
    hint: "Check every 90 days",
  },
  {
    id: "halfYearly" as const,
    label: "Half-Yearly",
    hint: "Check every 180 days",
  },
];

interface CheckingDurationProps {
  currentRisk?: string;
}

export function CheckingDuration({ currentRisk }: CheckingDurationProps) {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { duration: savedDuration, riskLevel } = useUserStrategy(hydrated ? address : undefined);
  const { setStrategy, isLoading, error, success } = useSetStrategy();
  
  const [duration, setDuration] = useState<DurationKey>(savedDuration);
  const [localSuccess, setLocalSuccess] = useState(false);

  const handleDurationChange = async (newDuration: DurationKey) => {
    setDuration(newDuration);
    setLocalSuccess(false);
    
    try {
      await setStrategy(riskLevel, newDuration);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update duration:", err);
    }
  };

  return (
    <div className="surface-card h-full flex flex-col p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-brand-black">Checking frequency</h3>
          <p className="mt-1 text-xs text-neutral-600">
            How often the system rebalances. More frequent checks = faster response, higher gas costs.
          </p>
        </div>
        <span
          className="flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full border border-brand-gray bg-brand-bg text-[10px] font-bold text-neutral-600"
          title="More frequent checks = faster response to APY changes, but higher gas costs. Less frequent = lower costs but slower adaptation."
        >
          ?
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {durations.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => handleDurationChange(d.id)}
            disabled={isLoading}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
              duration === d.id
                ? "border-brand-green bg-brand-green/10 text-brand-black"
                : "border-brand-gray/80 bg-white text-neutral-600 hover:border-brand-gray"
            }`}
          >
            <span className="text-sm font-semibold block">{d.label}</span>
            <span className="mt-0.5 block text-[10px] leading-tight text-neutral-500">
              {d.hint.replace("Check every ", "").replace(" hours", "h").replace(" days", "d")}
            </span>
          </button>
        ))}
      </div>

      {/* Status Messages */}
      <div className="mt-4 min-h-[1.25rem]">
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
            ✓ Updated to {duration}
          </p>
        )}
      </div>

      <div className="mt-auto border-t border-brand-gray/60 pt-4">
        <p className="text-xs leading-relaxed text-neutral-600">
          <span className="font-semibold text-brand-black">Rebalancing:</span> Automatically moves funds between Aave v3 and Compound v3 based on APY differential.
        </p>
      </div>
    </div>
  );
}
