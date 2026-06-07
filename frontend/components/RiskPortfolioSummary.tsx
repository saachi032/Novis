"use client";

import type { RiskGroupSummary } from "@/lib/utils/portfolioAnalytics";
import { formatPct, formatUsd } from "@/lib/utils/portfolioAnalytics";
import type { Investment } from "@/lib/hooks/useTransactionHistory";
import { ProtocolSplitBars } from "@/components/ProtocolSplitBars";
import { useVaultAPYs } from "@/lib/hooks/useVaultData";
import { isLivePositionInvestment } from "@/lib/utils/liveVaultInvestment";

const EXPLORER = "https://sepolia.basescan.org";

const RISK_STYLES = {
  conservative: "border-blue-200 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20",
  balanced: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/20",
  aggressive: "border-orange-200 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/20",
};

const RISK_BADGE = {
  conservative: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  balanced: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  aggressive: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

type RiskPortfolioSummaryProps = {
  groups: RiskGroupSummary[];
  onSelectDeposit: (investment: Investment) => void;
  onSelectGroup?: (group: RiskGroupSummary) => void;
};

export function RiskPortfolioSummary({
  groups,
  onSelectDeposit,
  onSelectGroup,
}: RiskPortfolioSummaryProps) {
  const { aaveAPY, compoundAPY, morphoAPY } = useVaultAPYs();

  if (groups.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center text-sm text-neutral-500">
        No deposits grouped by risk yet. Make a deposit with a risk profile to see buckets here.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.map((group) => {
        const yieldPositive = group.yieldUsd >= 0;
        return (
          <div
            key={group.riskLevel}
            className={`surface-card rounded-2xl border-2 p-5 ${RISK_STYLES[group.riskLevel]}`}
          >
            <button
              type="button"
              onClick={() => onSelectGroup?.(group)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {group.label}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_BADGE[group.riskLevel]}`}>
                  {group.riskLevel}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">{group.hint}</p>
              <p className="mt-3 font-display text-2xl font-bold text-brand-black">
                ${formatUsd(group.totalDeposited)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {group.depositCount} deposit{group.depositCount !== 1 ? "s" : ""} · est. value $
                {formatUsd(group.estimatedCurrentValue)}
              </p>
              <p className={`mt-2 text-sm font-semibold ${yieldPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                Yield {yieldPositive ? "+" : ""}${formatUsd(Math.abs(group.yieldUsd))} ({yieldPositive ? "+" : ""}
                {formatPct(group.yieldPct)}%)
              </p>
            </button>

            <div className="mt-4 border-t border-brand-gray/50 pt-4 dark:border-neutral-600">
              <ProtocolSplitBars
                split={group.allocationAtDeposit}
                title="Allocation at deposit (combined)"
                subtitle="How these deposits were split when invested."
                compact
                apys={{ aave: aaveAPY, compound: compoundAPY, morpho: morphoAPY }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Individual deposits
              </p>
              {group.deposits.map((dep) => {
                const isLive = isLivePositionInvestment(dep);
                return (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => onSelectDeposit(dep)}
                    className="flex w-full items-center justify-between rounded-lg border border-brand-gray/50 bg-white/80 px-3 py-2 text-left text-xs hover:bg-white dark:bg-neutral-800/50 dark:border-neutral-600 dark:hover:bg-neutral-700/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {isLive ? "Live position" : new Date(dep.createdAt).toLocaleDateString()}
                      </span>
                      {!isLive && dep.id && dep.id.startsWith("0x") && (
                        <a
                          href={`${EXPLORER}/tx/${dep.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-brand-green hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dep.id.slice(0, 10)}…
                        </a>
                      )}
                    </div>
                    <span className="font-semibold text-brand-black">
                      ${formatUsd(parseFloat(dep.amount))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
