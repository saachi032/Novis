"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { useUserPositionValue } from "@/lib/hooks/useVaultData";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { parseDepositHistory } from "@/lib/utils/depositHistory";
import { DepositHistoryModal } from "./DepositHistoryModal";

export function HistoricalPerformanceCard() {
  const { address } = useAccount();
  const { rawEvents } = useTransactionHistory();
  const { positionValue } = useUserPositionValue(address);
  const { aavePercentage, compoundPercentage, morphoPercentage } = useUserPositionBreakdown(address);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { deposits, groupedByRisk, totalDeposited } = useMemo(() => {
    return parseDepositHistory(rawEvents || []);
  }, [rawEvents]);

  const liveValue = parseFloat(positionValue || "0");
  const totalYield = liveValue - totalDeposited;
  const yieldPercentage = totalDeposited > 0 ? (totalYield / totalDeposited) * 100 : 0;

  if (totalDeposited === 0) {
    return null; // Don't show if no history
  }

  return (
    <div className="surface-card rounded-2xl p-6 mt-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Historical Performance & Distribution
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-brand-black dark:text-white">
            Yield Generated: <span className={totalYield >= 0 ? "text-brand-green" : "text-red-500"}>
              ${totalYield >= 0 ? "+" : ""}{totalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm ml-2">
                ({yieldPercentage >= 0 ? "+" : ""}{yieldPercentage.toFixed(2)}%)
              </span>
            </span>
          </h3>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-xs font-semibold text-brand-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap"
        >
          View Deposit History
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {/* Risk Groupings */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Total Deposited by Strategy
          </p>
          <div className="space-y-3">
            {groupedByRisk.map((group) => (
              <div key={group.riskLevel} className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {group.riskLevel}
                </span>
                <span className="text-sm font-mono text-brand-black dark:text-white">
                  ${group.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Total</span>
              <span className="text-sm font-mono font-bold text-brand-black dark:text-white">
                ${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Live Protocol Distribution */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Live Protocol Distribution
          </p>
          
          {/* Progress Bar */}
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-4">
            <div className="bg-[#9966FF]" style={{ width: `${aavePercentage}%` }} title="Aave" />
            <div className="bg-[#00D395]" style={{ width: `${compoundPercentage}%` }} title="Compound" />
            <div className="bg-[#3B82F6]" style={{ width: `${morphoPercentage}%` }} title="Morpho" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                <span className="text-neutral-600 dark:text-neutral-300">Morpho Blue</span>
              </div>
              <span className="font-mono text-brand-black dark:text-white">{morphoPercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00D395]"></span>
                <span className="text-neutral-600 dark:text-neutral-300">Compound v3</span>
              </div>
              <span className="font-mono text-brand-black dark:text-white">{compoundPercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#9966FF]"></span>
                <span className="text-neutral-600 dark:text-neutral-300">Aave v3</span>
              </div>
              <span className="font-mono text-brand-black dark:text-white">{aavePercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      <DepositHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deposits={deposits}
      />
    </div>
  );
}
