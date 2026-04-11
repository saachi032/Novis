"use client";

import { useMemo, useState } from "react";
import type { Investment } from "@/lib/hooks/useTransactionHistory";

interface InvestmentDetailProps {
  investment: Investment;
  onClose: () => void;
}

export function InvestmentDetail({ investment, onClose }: InvestmentDetailProps) {
  const [view, setView] = useState<"overview" | "history" | "chart">("overview");
  const stats = useMemo(() => {
    const firstYield = investment.yields[0];
    const lastYield = investment.yields[investment.yields.length - 1];
    const totalDays = Math.floor(
      (lastYield.timestamp - firstYield.timestamp) / (1000 * 60 * 60 * 24)
    );
    const yieldAmount = parseFloat(lastYield.yield);
    const initialInvestment = parseFloat(investment.amount);
    const yieldPercentage =
      initialInvestment > 0 ? ((yieldAmount / initialInvestment) * 100).toFixed(2) : "0";

    return {
      totalDays,
      yieldAmount: yieldAmount.toFixed(2),
      yieldPercentage,
      startDate: new Date(investment.createdAt),
      currentValue: investment.currentValue || investment.amount,
    };
  }, [investment]);

  const riskBagde = {
    conservative: "bg-blue-100 text-blue-800",
    balanced: "bg-green-100 text-green-800",
    aggressive: "bg-orange-100 text-orange-800",
  };

  const durationLabel = {
    daily: "Daily checks",
    weekly: "Weekly checks",
    monthly: "Monthly checks",
    quarterly: "Quarterly checks",
    halfYearly: "Half-yearly checks",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="surface-card w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-black">
              Investment #{investment.id.slice(-6)}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Created {stats.startDate.toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-brand-black text-xl"
          >
            ✕
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex gap-2 mb-6">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${riskBagde[investment.riskLevel]}`}
          >
            {investment.riskLevel.charAt(0).toUpperCase() + investment.riskLevel.slice(1)} Risk
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {durationLabel[investment.duration]}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              investment.status === "active"
                ? "bg-green-100 text-green-800"
                : investment.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {investment.status === "active"
              ? "Completed"
              : investment.status === "failed"
                ? "Failed"
                : "Pending"}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-brand-bg p-4 rounded-lg">
            <p className="text-xs font-semibold text-neutral-600">Initial Deposit</p>
            <p className="mt-2 font-display text-xl font-bold text-brand-black">
              ${parseFloat(investment.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-brand-bg p-4 rounded-lg">
            <p className="text-xs font-semibold text-neutral-600">Current Value</p>
            <p className="mt-2 font-display text-xl font-bold text-brand-black">
              ${parseFloat(stats.currentValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-xs font-semibold text-green-700">Total Yield Earned</p>
            <p className="mt-2 font-display text-xl font-bold text-green-700">
              ${stats.yieldAmount}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-xs font-semibold text-green-700">Yield %</p>
            <p className="mt-2 font-display text-xl font-bold text-green-700">{stats.yieldPercentage}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-brand-gray">
          <button
            onClick={() => setView("overview")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              view === "overview"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-neutral-600 hover:text-brand-black"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              view === "history"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-neutral-600 hover:text-brand-black"
            }`}
          >
            Transaction History
          </button>
          <button
            onClick={() => setView("chart")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              view === "chart"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-neutral-600 hover:text-brand-black"
            }`}
          >
            Charts
          </button>
        </div>

        {/* Overview Tab */}
        {view === "overview" && (
          <div className="space-y-4">
            <div className="bg-brand-bg p-4 rounded-lg">
              <p className="text-xs font-semibold text-neutral-600">Duration</p>
              <p className="mt-1 text-sm text-brand-black">{stats.totalDays} days</p>
            </div>
            <div className="bg-brand-bg p-4 rounded-lg">
              <p className="text-xs font-semibold text-neutral-600">Risk Profile</p>
              <p className="mt-1 text-sm text-brand-black">
                {investment.riskLevel === "conservative"
                  ? "Conservative - 40% allocation"
                  : investment.riskLevel === "balanced"
                    ? "Balanced - 60% allocation"
                    : "Aggressive - 80% allocation"}
              </p>
            </div>
            <div className="bg-brand-bg p-4 rounded-lg">
              <p className="text-xs font-semibold text-neutral-600">Rebalance Frequency</p>
              <p className="mt-1 text-sm text-brand-black">{durationLabel[investment.duration]}</p>
            </div>
          </div>
        )}

        {/* History Tab */}
        {view === "history" && (
          <div className="space-y-3">
            {investment.transactions.length === 0 ? (
              <p className="text-sm text-neutral-500">No transactions yet</p>
            ) : (
              investment.transactions.map((txn) => {
                console.log("Transaction status:", txn.status);
                return (
                <div
                  key={txn.id}
                  className="border border-brand-gray rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-brand-black text-sm">
                        {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                      </p>
                      <span
                        className={`px-3 py-1 text-[10px] font-semibold rounded ${
                          txn.status === "active"
                            ? "bg-green-100 text-green-800"
                            : txn.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {txn.status == "active" ? "Completed" : txn.status === "failed" ? "✗ Failed" : "Pending"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-black text-lg">
                        ${parseFloat(txn.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Protocol Allocation */}
                  {txn.type === "deposit" && txn.aaveAmount && txn.compoundAmount && (
                    <div className="bg-brand-bg/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Allocated to:</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-neutral-600 font-medium">Aave v3</span>
                          </div>
                          <span className="text-xs font-semibold text-brand-black">
                            ${parseFloat(txn.aaveAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({txn.aavePercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${txn.aavePercentage || 42}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            <span className="text-xs text-neutral-600 font-medium">Compound v3</span>
                          </div>
                          <span className="text-xs font-semibold text-brand-black">
                            ${parseFloat(txn.compoundAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ({txn.compoundPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${txn.compoundPercentage || 58}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <p>{new Date(txn.timestamp).toLocaleString()}</p>
                    <p className="font-mono text-neutral-500">{txn.txHash === "failed" ? "Failed" : txn.txHash.slice(0, 16)}...</p>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}

        {/* Charts Tab */}
        {view === "chart" && (
          <div className="space-y-6">
            {/* Line Chart - Value Over Time */}
            <div>
              <h4 className="text-sm font-semibold text-brand-black mb-4">Portfolio Value Over Time</h4>
              <div className="bg-brand-bg p-4 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Line Chart Placeholder</p>
                  <div className="mt-4 space-y-2 w-full">
                    {investment.yields.map((y, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">
                          {new Date(y.timestamp).toLocaleDateString()}
                        </span>
                        <div className="flex-1 mx-2 h-1 bg-brand-green rounded"></div>
                        <span className="font-semibold text-brand-black">
                          ${parseFloat(y.value).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bar Chart - Yield Earned */}
            <div>
              <h4 className="text-sm font-semibold text-brand-black mb-4">Yield Progression</h4>
              <div className="bg-brand-bg p-4 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center w-full">
                  <p className="text-xs text-neutral-500 mb-4">Bar Chart Placeholder</p>
                  <div className="flex items-end justify-center gap-2 h-32">
                    {investment.yields.map((y, idx) => {
                      const maxYield = Math.max(
                        ...investment.yields.map((yd) => parseFloat(yd.yield))
                      );
                      const height = maxYield > 0 ? (parseFloat(y.yield) / maxYield) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-green-400 rounded-t"
                          style={{ height: `${height}%`, minHeight: "4px" }}
                          title={`${y.timestamp}: $${y.yield}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-4 text-xs text-neutral-600">
                    Peak Yield: ${Math.max(...investment.yields.map((y) => parseFloat(y.yield))).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* APY Over Time */}
            <div>
              <h4 className="text-sm font-semibold text-brand-black mb-4">APY History</h4>
              <div className="bg-brand-bg p-4 rounded-lg space-y-2">
                {investment.yields.map((y, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">
                      {new Date(y.timestamp).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-brand-black">{y.apy}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 rounded-lg bg-brand-green text-white font-semibold transition hover:bg-brand-green/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
