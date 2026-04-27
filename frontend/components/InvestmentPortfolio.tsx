"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { useUserVaultShares, useUserPositionValue, useTotalAssets } from "@/lib/hooks/useVaultData";
import { InvestmentDetail } from "@/components/InvestmentDetail";
import { useHydrated } from "@/lib/hooks/useHydrated";
import type { Investment } from "@/lib/hooks/useTransactionHistory";

export function InvestmentPortfolio() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { investments, isLoading } = useTransactionHistory();
  const { shares } = useUserVaultShares(address);
  const { positionValue } = useUserPositionValue(address);
  const { totalAssets } = useTotalAssets();
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  // Filter active investments
  const activeInvestments = investments.filter((inv) => inv.status === "active");
  const failedInvestments = investments.filter((inv) => inv.status === "failed");
  const withdrawnInvestments = investments.filter((inv) => inv.status === "withdrawn");

  // Check if user has actual vault position
  const hasVaultPosition = shares && parseFloat(shares) > 0;
  const vaultPositionValue = positionValue ? parseFloat(positionValue) : 0;

  if (!hydrated || isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="surface-card h-40 animate-pulse bg-neutral-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  // Show vault position if no individual investments but has vault shares
  if (investments.length === 0 && !hasVaultPosition) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center">
        <p className="text-neutral-500">No investments yet. Make your first deposit to get started!</p>
      </div>
    );
  }

  const getTotalValue = (invs: Investment[]) =>
    invs.reduce((sum, inv) => sum + parseFloat(inv.currentValue || inv.amount), 0).toFixed(2);

  const getTotalYield = (invs: Investment[]) =>
    invs.reduce((sum, inv) => sum + parseFloat(inv.yieldEarned || "0"), 0).toFixed(2);

  // Combine total from investments + vault position
  const combinedTotalValue = (parseFloat(getTotalValue(activeInvestments)) + vaultPositionValue).toFixed(2);
  const combinedTotalYield = getTotalYield(activeInvestments);

  return (
    <>
      {/* Summary Stats */}
      {(activeInvestments.length > 0 || hasVaultPosition) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="surface-card p-4 rounded-lg">
            <p className="text-xs text-neutral-600 font-semibold">Active Investments</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">
              {activeInvestments.length + (hasVaultPosition ? 1 : 0)}
            </p>
          </div>
          <div className="surface-card p-4 rounded-lg">
            <p className="text-xs text-neutral-600 font-semibold">Total Deployed</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">
              ${parseFloat(combinedTotalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="surface-card p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs text-green-700 font-semibold">Total Yield</p>
            <p className="mt-2 font-display text-2xl font-bold text-green-700">
              ${parseFloat(combinedTotalYield).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Active Investments */}
      {(activeInvestments.length > 0 || hasVaultPosition) && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-brand-black mb-4">Active Investments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vault Position Card */}
            {hasVaultPosition && (
              <div className="surface-card p-5 rounded-xl transition duration-300 hover:scale-[1.02] hover:shadow-lg text-left border-2 border-brand-green">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-neutral-600">Vault Position</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-semibold rounded bg-green-100 text-green-800">
                    Active
                  </span>
                </div>

                <p className="font-display text-2xl font-bold text-brand-black">
                  ${vaultPositionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>

                <div className="mt-3 pt-3 border-t border-brand-gray">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-600">Shares</p>
                      <p className="text-sm font-semibold text-brand-black text-opacity-80">
                        {parseFloat(shares || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600">Status</p>
                      <p className="text-sm font-semibold text-brand-green">
                        Earning yield
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-brand-gray">
                  <p className="text-[10px] font-semibold text-brand-green">
                    Your main vault position (Aave + Compound)
                  </p>
                </div>
              </div>
            )}
            {activeInvestments.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvestment(inv)}
                className="surface-card p-5 rounded-xl transition duration-300 hover:scale-[1.02] hover:shadow-lg text-left"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-neutral-600">Investment #{inv.id.slice(-6)}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-[10px] font-semibold rounded ${
                      inv.riskLevel === "conservative"
                        ? "bg-blue-100 text-blue-800"
                        : inv.riskLevel === "balanced"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {inv.riskLevel.charAt(0).toUpperCase() + inv.riskLevel.slice(1)}
                  </span>
                </div>

                {/* Amount */}
                <p className="font-display text-2xl font-bold text-brand-black">
                  ${parseFloat(inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>

                {/* Yield */}
                <div className="mt-3 pt-3 border-t border-brand-gray">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-600">Current Value</p>
                      <p className="text-sm font-semibold text-brand-black text-opacity-80">
                        ${parseFloat(inv.currentValue || inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600">Yield Earned</p>
                      <p className="text-sm font-semibold text-green-600">
                        +${parseFloat(inv.yieldEarned || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Status */}
                <div className="mt-3 pt-3 border-t border-brand-gray flex items-center justify-between">
                  <span className="text-[10px] text-neutral-600 font-semibold">
                    {inv.duration.charAt(0).toUpperCase() + inv.duration.slice(1)} Checks
                  </span>
                  <span className="text-[10px] font-semibold text-brand-green">
                    Click to view details →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Failed Investments */}
      {failedInvestments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-red-600 mb-4">Failed Transactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {failedInvestments.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvestment(inv)}
                className="surface-card p-5 rounded-xl transition duration-300 hover:scale-[1.02] border-2 border-red-200 bg-red-50 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-red-700 font-semibold">Failed</p>
                  <span className={`px-2 py-1 text-[10px] font-semibold rounded ${
                      inv.riskLevel === "conservative"
                        ? "bg-blue-100 text-blue-800"
                        : inv.riskLevel === "balanced"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {inv.riskLevel.charAt(0).toUpperCase() + inv.riskLevel.slice(1)}
                  </span>
                </div>
                <p className="font-display text-xl font-bold text-red-700">
                  ${parseFloat(inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Attempted on {new Date(inv.createdAt).toLocaleDateString()}
                </p>
                <span className="text-[10px] font-semibold text-red-600 mt-3 block">
                  Click to view error details →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawn Investments */}
      {withdrawnInvestments.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-neutral-600 mb-4">Withdrawn Investments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {withdrawnInvestments.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvestment(inv)}
                className="surface-card p-5 rounded-xl transition duration-300 hover:scale-[1.02] opacity-75 text-left"
              >
                <p className="text-xs text-neutral-600">Investment #{inv.id.slice(-6)}</p>
                <p className="font-display text-xl font-bold text-brand-black mt-1">
                  ${parseFloat(inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  Earned: ${parseFloat(inv.yieldEarned || "0").toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvestment && (
        <InvestmentDetail
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
        />
      )}
    </>
  );
}
