"use client";

import type { PortfolioOverview } from "@/lib/utils/portfolioAnalytics";
import { formatPct, formatUsd } from "@/lib/utils/portfolioAnalytics";
import { ProtocolSplitBars } from "@/components/ProtocolSplitBars";
import { useVaultAPYs } from "@/lib/hooks/useVaultData";

export function PortfolioOverviewSummary({ overview }: { overview: PortfolioOverview }) {
  const yieldPositive = overview.totalYieldUsd >= 0;
  const { aaveAPY, compoundAPY, morphoAPY } = useVaultAPYs();

  return (
    <div className="surface-card rounded-2xl border border-brand-gray/70 p-5 space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold text-brand-black">Overall portfolio</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Total deposited, current value, yield, and live split across Aave, Compound, and Morpho.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-brand-bg p-4 dark:bg-neutral-800/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Total deposited</p>
          <p className="mt-2 font-display text-xl font-bold text-brand-black">
            ${formatUsd(overview.totalDeposited)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">{overview.depositCount} deposit(s)</p>
        </div>
        <div className="rounded-xl bg-brand-bg p-4 dark:bg-neutral-800/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Current value</p>
          <p className="mt-2 font-display text-xl font-bold text-brand-black">
            ${formatUsd(overview.currentValue)}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${yieldPositive ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${yieldPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            Total yield
          </p>
          <p className={`mt-2 font-display text-xl font-bold ${yieldPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {yieldPositive ? "+" : ""}${formatUsd(Math.abs(overview.totalYieldUsd))}
          </p>
          <p className={`mt-1 text-[11px] ${yieldPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {yieldPositive ? "+" : ""}{formatPct(overview.totalYieldPct)}%
          </p>
        </div>
        <div className="rounded-xl bg-brand-bg p-4 dark:bg-neutral-800/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Risk buckets</p>
          <p className="mt-2 font-display text-xl font-bold text-brand-black">
            {overview.riskGroups.length}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">Low / medium / high groups</p>
        </div>
      </div>

      {overview.liveProtocolSplit && (
        <div className="border-t border-brand-gray/60 pt-5 dark:border-neutral-600">
          <ProtocolSplitBars
            split={overview.liveProtocolSplit}
            title="Live protocol distribution (wallet total)"
            subtitle="Current on-chain split from StrategyRouter — updates when funds rebalance."
            apys={{ aave: aaveAPY, compound: compoundAPY, morpho: morphoAPY }}
          />
        </div>
      )}
    </div>
  );
}
