"use client";

import { useMemo, useState } from "react";
import type { Investment } from "@/lib/hooks/useTransactionHistory";
import type { RebalanceEntry } from "@/lib/hooks/useRebalanceHistory";
import {
  buildProtocolSplitFromBalances,
  formatPct,
  formatUsd,
  sumProtocolFromTransactions,
  type ProtocolSplit,
  type RiskGroupSummary,
} from "@/lib/utils/portfolioAnalytics";
import { isLivePositionInvestment } from "@/lib/utils/liveVaultInvestment";
import { ProtocolSplitBars } from "@/components/ProtocolSplitBars";
import { useVaultAPYs } from "@/lib/hooks/useVaultData";

const EXPLORER = "https://sepolia.basescan.org";

interface InvestmentDetailProps {
  investment: Investment;
  onClose: () => void;
  liveProtocol?: {
    aaveBalance: string;
    compoundBalance: string;
    morphoBalance: string;
  };
  rebalanceHistory?: RebalanceEntry[];
  riskGroup?: RiskGroupSummary;
}

export function InvestmentDetail({
  investment,
  onClose,
  liveProtocol,
  rebalanceHistory = [],
  riskGroup,
}: InvestmentDetailProps) {
  const [view, setView] = useState<"overview" | "splits" | "activity">("overview");
  const isLive = isLivePositionInvestment(investment);
  const { aaveAPY, compoundAPY, morphoAPY } = useVaultAPYs();

  const depositTxn = investment.transactions.find((t) => t.type === "deposit");
  const depositSplit = useMemo(
    () =>
      riskGroup
        ? riskGroup.allocationAtDeposit
        : depositTxn
          ? sumProtocolFromTransactions([depositTxn])
          : sumProtocolFromTransactions(investment.transactions),
    [depositTxn, investment.transactions, riskGroup]
  );

  const liveSplit: ProtocolSplit | null = useMemo(() => {
    if (!liveProtocol) return null;
    const split = buildProtocolSplitFromBalances(
      liveProtocol.aaveBalance,
      liveProtocol.compoundBalance,
      liveProtocol.morphoBalance
    );
    return split.total > 0 ? split : null;
  }, [liveProtocol]);

  const stats = useMemo(() => {
    const initialInvestment = riskGroup
      ? riskGroup.totalDeposited
      : parseFloat(investment.amount);
    const currentValue = riskGroup
      ? riskGroup.estimatedCurrentValue
      : parseFloat(investment.currentValue || investment.amount);
    const yieldUsd = currentValue - initialInvestment;
    const yieldPct = initialInvestment > 0 ? (yieldUsd / initialInvestment) * 100 : 0;

    return {
      initialInvestment,
      currentValue,
      yieldUsd,
      yieldPct,
      startDate: new Date(investment.createdAt),
      depositCount: riskGroup?.depositCount ?? 1,
    };
  }, [investment, riskGroup]);

  const activity = useMemo(() => {
    const txns = riskGroup
      ? riskGroup.deposits.flatMap((d) => d.transactions)
      : investment.transactions;
    return [...txns].sort((a, b) => b.timestamp - a.timestamp);
  }, [investment.transactions, riskGroup]);

  const riskBadge = {
    conservative: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    balanced: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    aggressive: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  };

  const durationLabel = {
    daily: "Daily rebalance checks",
    weekly: "Weekly rebalance checks",
    monthly: "Monthly rebalance checks",
    quarterly: "Quarterly rebalance checks",
    halfYearly: "Half-yearly rebalance checks",
  };

  const title = riskGroup
    ? `${riskGroup.label} bucket (${riskGroup.depositCount} deposits)`
    : isLive
      ? "Live vault position"
      : `Deposit · ${stats.startDate.toLocaleDateString()}`;

  const apys = { aave: aaveAPY, compound: compoundAPY, morpho: morphoAPY };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-black">{title}</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {riskGroup
                ? `Combined view · $${formatUsd(riskGroup.totalDeposited)} deposited`
                : isLive
                  ? "Current vault shares on Base Sepolia"
                  : `Deposited ${stats.startDate.toLocaleString()}`}
            </p>
            {/* Tx hash link */}
            {!riskGroup && !isLive && investment.id && investment.id.startsWith("0x") && (
              <a
                href={`${EXPLORER}/tx/${investment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[11px] font-mono text-brand-green hover:underline"
              >
                View on BaseScan ↗
              </a>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-xl text-neutral-400 hover:bg-neutral-100 hover:text-brand-black dark:hover:bg-neutral-700">
            ✕
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${riskBadge[riskGroup?.riskLevel ?? investment.riskLevel]}`}
          >
            {(riskGroup?.riskLevel ?? investment.riskLevel).replace(/^./, (c) => c.toUpperCase())} risk
          </span>
          {!riskGroup && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-neutral-700 dark:text-neutral-200">
              {durationLabel[investment.duration]}
            </span>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-brand-bg p-4 dark:bg-neutral-800/50">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Total deposited</p>
            <p className="mt-2 font-display text-xl font-bold text-brand-black">
              ${formatUsd(stats.initialInvestment)}
            </p>
          </div>
          <div className="rounded-lg bg-brand-bg p-4 dark:bg-neutral-800/50">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Est. current value</p>
            <p className="mt-2 font-display text-xl font-bold text-brand-black">
              ${formatUsd(stats.currentValue)}
            </p>
          </div>
          <div
            className={`rounded-lg border p-4 ${stats.yieldUsd >= 0 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20"}`}
          >
            <p className={`text-xs font-semibold ${stats.yieldUsd >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              Yield earned
            </p>
            <p className={`mt-2 font-display text-xl font-bold ${stats.yieldUsd >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              {stats.yieldUsd >= 0 ? "+" : ""}${formatUsd(Math.abs(stats.yieldUsd))}
            </p>
          </div>
          <div
            className={`rounded-lg border p-4 ${stats.yieldUsd >= 0 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20"}`}
          >
            <p className={`text-xs font-semibold ${stats.yieldUsd >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              Yield %
            </p>
            <p className={`mt-2 font-display text-xl font-bold ${stats.yieldUsd >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              {stats.yieldUsd >= 0 ? "+" : ""}{formatPct(stats.yieldPct)}%
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-brand-gray dark:border-neutral-600">
          {(["overview", "splits", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                view === tab
                  ? "border-b-2 border-brand-green text-brand-green"
                  : "text-neutral-600 hover:text-brand-black dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {tab === "splits" ? "Protocol split" : tab}
            </button>
          ))}
        </div>

        {view === "overview" && (
          <div className="space-y-4">
            {riskGroup && (
              <div className="rounded-lg bg-brand-bg p-4 dark:bg-neutral-800/50">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Deposits in this bucket</p>
                <ul className="mt-2 space-y-1 text-sm text-brand-black">
                  {riskGroup.deposits.map((d) => (
                    <li key={d.id} className="flex justify-between">
                      <span>{new Date(d.createdAt).toLocaleString()}</span>
                      <span className="font-semibold">${formatUsd(parseFloat(d.amount))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-lg bg-brand-bg p-4 dark:bg-neutral-800/50">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Strategy</p>
              <p className="mt-1 text-sm text-brand-black">{riskGroup?.hint ?? durationLabel[investment.duration]}</p>
            </div>
            {depositTxn?.note && (
              <div className="rounded-lg bg-brand-bg p-4 dark:bg-neutral-800/50">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Note</p>
                <p className="mt-1 text-sm text-brand-black">{depositTxn.note}</p>
              </div>
            )}
          </div>
        )}

        {view === "splits" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-brand-gray/60 p-4 dark:border-neutral-600">
              <ProtocolSplitBars
                split={depositSplit}
                title="At deposit (combined %)"
                subtitle="Percentage split across Aave, Compound, and Morpho when funds were invested."
                apys={apys}
              />
            </div>
            {liveSplit && (
              <div className="rounded-xl border border-brand-green/40 bg-brand-green/5 p-4 dark:border-brand-green/30 dark:bg-brand-green/10">
                <ProtocolSplitBars
                  split={liveSplit}
                  title="Live wallet split (current %)"
                  subtitle="Your full position today — may differ after rebalances."
                  apys={apys}
                />
              </div>
            )}
            {liveSplit && depositSplit.total > 0 && (
              <div className="rounded-lg bg-brand-bg p-4 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                <p className="font-semibold text-brand-black">How to read this</p>
                <p className="mt-2">
                  <strong>Deposit split</strong> shows where money went when you deposited.{" "}
                  <strong>Live split</strong> shows where the router holds funds now after yield accrual and rebalancing.
                  The difference indicates how much the strategy router has moved your funds to chase better APY.
                </p>
              </div>
            )}
          </div>
        )}

        {view === "activity" && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Transactions
              </p>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-sm text-neutral-500">No transaction history for this selection.</p>
                ) : (
                  activity.map((txn) => (
                    <div key={txn.id} className="rounded-lg border border-brand-gray p-4 space-y-2 dark:border-neutral-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            txn.type === "deposit" ? "bg-emerald-500" :
                            txn.type === "withdrawal" ? "bg-red-500" :
                            "bg-blue-500"
                          }`} />
                          <p className="text-sm font-semibold capitalize text-brand-black">{txn.type}</p>
                        </div>
                        <p className="font-semibold text-brand-black">
                          ${formatUsd(parseFloat(txn.amount))}
                        </p>
                      </div>
                      {txn.note && <p className="text-xs text-neutral-600 dark:text-neutral-400">{txn.note}</p>}
                      {txn.type === "deposit" && (txn.aaveAmount || txn.compoundAmount) && (
                        <ProtocolSplitBars
                          split={sumProtocolFromTransactions([txn])}
                          compact
                          hideZero
                          apys={apys}
                        />
                      )}
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span>{new Date(txn.timestamp).toLocaleString()}</span>
                        {txn.txHash && txn.txHash !== "live" && (
                          <a
                            href={`${EXPLORER}/tx/${txn.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-brand-green hover:underline"
                          >
                            {txn.txHash.slice(0, 10)}… ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {rebalanceHistory.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Rebalance history
                </p>
                <div className="space-y-2">
                  {rebalanceHistory.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-gray/50 px-3 py-2 text-xs dark:border-neutral-600"
                    >
                      <span className="text-neutral-500">{entry.when}</span>
                      <span className="font-medium text-brand-black">
                        {entry.from} → {entry.to}
                      </span>
                      <span className="font-mono">{entry.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-green px-4 py-2 font-semibold text-white transition hover:bg-brand-green/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
