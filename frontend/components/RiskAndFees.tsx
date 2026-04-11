"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserStrategy, useSetStrategy, type RiskLevel, DURATION_OPTIONS } from "@/lib/hooks/useRiskRegistry";

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
  const { address } = useAccount();
  const { riskLevel: savedRisk, duration } = useUserStrategy(address);
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
    <div className="surface-card h-full min-h-[17rem] p-5 transition duration-300 hover:scale-[1.01]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-black">Risk level</h3>
          <p className="mt-1 max-w-md text-xs text-neutral-600">
            Allocation percentage stored in{" "}
            <code className="text-neutral-700">RiskRegistry</code>. Controls yield/volatility tradeoff.
          </p>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 cursor-help items-center justify-center rounded-full border border-brand-gray bg-brand-bg text-xs font-semibold text-neutral-600"
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
            className={`flex-1 rounded-2xl border px-3 py-3 text-left text-xs transition duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
              risk === l.id
                ? "border-brand-green bg-brand-green/10 text-brand-black"
                : "border-brand-gray/80 bg-white text-neutral-600 hover:border-brand-gray"
            }`}
          >
            <span className="block text-sm font-bold">{l.label}</span>
            <span className="mt-1 block text-[11px] leading-snug text-neutral-500">
              {l.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Status Messages */}
      <div className="mt-3 min-h-[1.25rem]">
        {isLoading && (
          <p className="text-xs text-neutral-600 animate-pulse">
            Updating risk level...
          </p>
        )}
        {error && (
          <p className="text-xs text-red-600">
            ✗ {error}
          </p>
        )}
        {(success || localSuccess) && (
          <p className="text-xs text-brand-green">
            ✓ Risk level updated
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-brand-gray/60 pt-5">
        <p className="text-xs text-neutral-600">
          <span className="font-semibold text-brand-black">Fee transparency:</span>{" "}
          0.5% performance fee on yield only (not principal). No deposit or
          withdrawal fees in v1.
        </p>
        <button
          type="button"
          onClick={() => setFaqOpen((o) => !o)}
          className="mt-3 text-xs font-semibold text-brand-green transition duration-300 hover:text-[#3d5a56]"
        >
          {faqOpen ? "Hide" : "Show"} rebalance FAQ
        </button>
        {faqOpen && (
          <ul className="mt-3 list-inside list-disc space-y-2 text-[11px] leading-relaxed text-neutral-600">
            <li>
              Rebalance when |Aave APY − Compound APY| exceeds threshold (e.g.
              3%) and 7-day projected gain exceeds gas.
            </li>
            <li>24-hour cooldown between rebalances to reduce ping-pong.</li>
            <li>
              Chainlink Automation primary path; <code className="text-neutral-800">forceRebalance</code> available for manual
              trigger.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
