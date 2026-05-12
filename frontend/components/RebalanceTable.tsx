"use client";

import { useAccount } from "wagmi";
import { useForceRebalance } from "@/lib/hooks/useForceRebalance";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useRebalanceHistory } from "@/lib/hooks/useRebalanceHistory";
import { useState } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";

export function RebalanceTable() {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { forceRebalance, isLoading, error, success, txHash } = useForceRebalance();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    total,
  } = useUserPositionBreakdown(hydrated ? address : undefined);
  const { history, refreshHistory } = useRebalanceHistory();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleForceRebalance = async () => {
    try {
      console.log("Starting force rebalance...");
      await forceRebalance();
      console.log("Rebalance completed, refreshing on-chain history...");
      await refreshHistory();

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error("Force rebalance failed:", err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current Position Breakdown */}
      {hydrated && (
        <div className="surface-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-brand-black mb-4">
            Current Position Breakdown
          </h3>
          
          {parseFloat(total) > 0 ? (
            <div className="space-y-4">
              {/* Aave */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-semibold text-brand-black">Aave v3</span>
                  </div>
                  <span className="text-xs font-bold text-brand-black">
                    ${parseFloat(aaveBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${aavePercentage}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-right text-[10px] text-neutral-600">
                  {aavePercentage}% of position
                </div>
              </div>

              {/* Compound */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs font-semibold text-brand-black">Compound v3</span>
                  </div>
                  <span className="text-xs font-bold text-brand-black">
                    ${parseFloat(compoundBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${compoundPercentage}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-right text-[10px] text-neutral-600">
                  {compoundPercentage}% of position
                </div>
              </div>

              {/* Morpho */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                    <span className="text-xs font-semibold text-brand-black">Morpho Blue</span>
                  </div>
                  <span className="text-xs font-bold text-brand-black">
                    ${parseFloat(morphoBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${morphoPercentage}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-right text-[10px] text-neutral-600">
                  {morphoPercentage}% of position
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-brand-gray pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-neutral-600">Total Deployed</span>
                  <span className="text-sm font-bold text-brand-black">
                    ${parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">No active position. Make your first deposit to get started.</p>
          )}
        </div>
      )}

      {/* Rebalance Controls */}
      <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-brand-black">
              Rebalance History
            </h3>
            <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-brand-gray bg-brand-bg px-3 py-1 text-[10px] font-semibold text-brand-green">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brand-green"
                aria-hidden
              />
              Automation by Chainlink Automation
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleForceRebalance}
              disabled={!hydrated || !isConnected || isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-green/90 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
            >
              {isLoading ? "Rebalancing..." : "🔄 Force Rebalance"}
            </button>
            {error && (
              <p className="text-[10px] text-red-600">✗ {error}</p>
            )}
            {(success || showSuccess) && (
              <p className="text-[10px] text-brand-green flex items-center gap-1">
                <span></span> Rebalance initiated! Updating allocation...
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-500">
          Funds automatically move to the protocol with highest APY. Click{" "}
          <span className="font-semibold">Force Rebalance</span> to trigger
          an immediate check.
        </p>

        {/* Debug Info */}
        <p className="mt-3 text-xs text-neutral-400">
          📊 History entries: {history.length}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-brand-gray/80 text-neutral-500">
                <th className="pb-2 pr-4 font-semibold">Time</th>
                <th className="pb-2 pr-4 font-semibold">From</th>
                <th className="pb-2 pr-4 font-semibold">To</th>
                <th className="pb-2 pr-4 font-semibold">Notional</th>
                <th className="pb-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="text-neutral-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-neutral-500">
                    No rebalance history yet. Click "Force Rebalance" to trigger the first rebalance.
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="border-b border-brand-gray/40">
                    <td className="py-3 pr-4 text-neutral-500">{entry.when}</td>
                    <td className="py-3 pr-4">{entry.from}</td>
                    <td className="py-3 pr-4">{entry.to}</td>
                    <td className="py-3 pr-4 font-mono text-sm text-brand-black">
                      {entry.amount}
                    </td>
                    <td className="py-3 text-neutral-500">{entry.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
