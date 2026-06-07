"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { useRebalanceHistory } from "@/lib/hooks/useRebalanceHistory";
import { useUserVaultShares, useUserPositionValue, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useUserStrategy } from "@/lib/hooks/useRiskRegistry";
import { InvestmentDetail } from "@/components/InvestmentDetail";
import { PortfolioOverviewSummary } from "@/components/PortfolioOverviewSummary";
import { RiskPortfolioSummary } from "@/components/RiskPortfolioSummary";
import { ProtocolSplitBars } from "@/components/ProtocolSplitBars";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";
import {
  buildLiveVaultInvestment,
  isLivePositionInvestment,
} from "@/lib/utils/liveVaultInvestment";
import { buildPortfolioOverview, formatUsd, sumProtocolFromTransactions } from "@/lib/utils/portfolioAnalytics";
import type { Investment } from "@/lib/hooks/useTransactionHistory";
import type { RiskGroupSummary } from "@/lib/utils/portfolioAnalytics";

const EXPLORER = "https://sepolia.basescan.org";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type PortfolioView = "overview" | "risk" | "deposits";

export function InvestmentPortfolio() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { investments, isLoading, error } = useTransactionHistory();
  const { history: rebalanceHistory } = useRebalanceHistory();
  const { riskLevel: currentStrategyRisk } = useUserStrategy(hydrated ? address : undefined);
  const { shares } = useUserVaultShares(address);
  const { positionValue } = useUserPositionValue(address);
  const { aaveAPY, compoundAPY, morphoAPY } = useVaultAPYs();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    total: protocolTotal,
  } = useUserPositionBreakdown(hydrated ? address : undefined);

  const [view, setView] = useState<PortfolioView>("overview");
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [selectedRiskGroup, setSelectedRiskGroup] = useState<RiskGroupSummary | null>(null);

  const activeInvestments = investments.filter((inv) => inv.status === "active");
  const hasVaultPosition = shares && parseFloat(shares) > 0;
  const vaultPositionValue = positionValue ? parseFloat(positionValue) : 0;

  const onChainDeposits = activeInvestments.filter((inv) => !isLivePositionInvestment(inv));

  const displayInvestments = useMemo(() => {
    if (onChainDeposits.length > 0) return onChainDeposits;
    if (hasVaultPosition && address && shares && positionValue) {
      const live = buildLiveVaultInvestment(address, shares, positionValue);
      if (live) {
        live.riskLevel = currentStrategyRisk;
        return [live];
      }
    }
    return activeInvestments;
  }, [
    onChainDeposits,
    activeInvestments,
    hasVaultPosition,
    address,
    shares,
    positionValue,
    currentStrategyRisk,
  ]);

  const overview = useMemo(
    () =>
      buildPortfolioOverview({
        investments: displayInvestments,
        currentValue: vaultPositionValue,
        aaveBalance,
        compoundBalance,
        morphoBalance,
        defaultRiskForLive: currentStrategyRisk,
      }),
    [
      displayInvestments,
      vaultPositionValue,
      aaveBalance,
      compoundBalance,
      morphoBalance,
      currentStrategyRisk,
    ]
  );

  const historyStillLoading = isLoading && onChainDeposits.length === 0;
  const liveProtocol = { aaveBalance, compoundBalance, morphoBalance };

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="surface-card h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (!address) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center">
        <p className="text-neutral-500">Connect your wallet on Base Sepolia to view your vault position.</p>
      </div>
    );
  }

  if (investments.length === 0 && !hasVaultPosition) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center">
        <p className="text-neutral-500">No investments yet. Deposit USDC into the vault to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {historyStillLoading && (
        <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg/40 p-4 text-sm text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/40 flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
          Scanning on-chain deposit events… totals and risk groups below use your live balance.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Full deposit history unavailable ({error}). Overview and risk groups still use live vault data.
        </div>
      )}

      {/* Top summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Vault</p>
          <p className="mt-2 font-display text-lg font-bold text-brand-black">USDC Yield Vault</p>
          <a
            href={`${EXPLORER}/address/${BASE_SEPOLIA_DEPLOYMENT.vaultManager}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block font-mono text-[11px] text-brand-green hover:underline"
          >
            {shortAddress(BASE_SEPOLIA_DEPLOYMENT.vaultManager)} ↗
          </a>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Your position</p>
          <p className="mt-2 font-display text-3xl font-bold text-brand-black">
            ${formatUsd(overview.currentValue)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Live USDC value</p>
        </div>
        <div className="surface-card rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-700 dark:bg-emerald-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Total deposited</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            ${formatUsd(overview.totalDeposited)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            {onChainDeposits.length > 0
              ? `${onChainDeposits.length} on-chain deposit(s)`
              : "From live vault balance"}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-brand-gray/60 pb-1 dark:border-neutral-600">
        {(
          [
            { id: "overview" as const, label: "Overall summary" },
            { id: "risk" as const, label: "By risk (low / medium / high)" },
            { id: "deposits" as const, label: "Each deposit" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              view === tab.id
                ? "bg-brand-green/10 text-brand-green"
                : "text-neutral-600 hover:text-brand-black dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "overview" && <PortfolioOverviewSummary overview={overview} />}

      {view === "risk" && (
        <RiskPortfolioSummary
          groups={overview.riskGroups}
          onSelectDeposit={setSelectedInvestment}
          onSelectGroup={setSelectedRiskGroup}
        />
      )}

      {view === "deposits" && (
        <div className="space-y-4">
          {hasVaultPosition && parseFloat(protocolTotal) > 0 && (
            <div className="surface-card rounded-2xl p-5">
              <ProtocolSplitBars
                split={
                  overview.liveProtocolSplit ?? {
                    aave: 0,
                    compound: 0,
                    morpho: 0,
                    total: 0,
                    aavePct: 0,
                    compoundPct: 0,
                    morphoPct: 0,
                  }
                }
                title="Live wallet split"
                subtitle={`Aave ${aavePercentage}% · Compound ${compoundPercentage}% · Morpho ${morphoPercentage}%`}
                apys={{ aave: aaveAPY, compound: compoundAPY, morpho: morphoAPY }}
              />
            </div>
          )}

          {displayInvestments.length === 0 ? (
            <div className="surface-card rounded-2xl p-6 text-center text-sm text-neutral-500">
              No deposits to list yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {displayInvestments.map((inv) => {
                const depositTxn = inv.transactions.find((t) => t.type === "deposit");
                const isLiveSummary = isLivePositionInvestment(inv);
                const initial = parseFloat(inv.amount);
                const current = parseFloat(inv.currentValue || inv.amount);
                const yieldUsd = current - initial;

                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedInvestment(inv)}
                    className="surface-card rounded-2xl border border-brand-gray/70 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {isLiveSummary ? "Live position" : "Deposit"}
                        </p>
                        <p className="mt-1 font-display text-xl font-bold text-brand-black">
                          ${formatUsd(initial)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {isLiveSummary
                            ? `${parseFloat(shares || "0").toFixed(4)} shares`
                            : new Date(inv.createdAt).toLocaleString()}
                        </p>
                        {/* Tx hash link */}
                        {!isLiveSummary && inv.id && inv.id.startsWith("0x") && (
                          <a
                            href={`${EXPLORER}/tx/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-[10px] font-mono text-brand-green hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inv.id.slice(0, 12)}… ↗
                          </a>
                        )}
                      </div>
                      <span className="rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-semibold capitalize text-brand-green">
                        {inv.riskLevel}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-gray/60 pt-3 text-[11px] dark:border-neutral-600">
                      <div>
                        <p className="text-neutral-500">Est. value</p>
                        <p className="font-semibold text-brand-black">${formatUsd(current)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Yield</p>
                        <p className={`font-semibold ${yieldUsd >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {yieldUsd >= 0 ? "+" : ""}${formatUsd(Math.abs(yieldUsd))}
                        </p>
                      </div>
                    </div>
                    {depositTxn && (depositTxn.aaveAmount || depositTxn.compoundAmount) && (
                      <div className="mt-3 border-t border-brand-gray/60 pt-3 dark:border-neutral-600">
                        <ProtocolSplitBars
                          split={sumProtocolFromTransactions([depositTxn])}
                          title="Split at deposit"
                          compact
                          apys={{ aave: aaveAPY, compound: compoundAPY, morpho: morphoAPY }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedInvestment && (
        <InvestmentDetail
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
          liveProtocol={liveProtocol}
          rebalanceHistory={rebalanceHistory}
        />
      )}

      {selectedRiskGroup && (
        <InvestmentDetail
          investment={selectedRiskGroup.deposits[0]}
          riskGroup={selectedRiskGroup}
          onClose={() => setSelectedRiskGroup(null)}
          liveProtocol={liveProtocol}
          rebalanceHistory={rebalanceHistory}
        />
      )}
    </div>
  );
}
