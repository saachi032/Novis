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

  const activeInvestments = investments.filter((inv) => inv.status === "active");

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

  if (investments.length === 0 && !hasVaultPosition) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center">
        <p className="text-neutral-500">No investments yet. Make your first deposit to get started!</p>
      </div>
    );
  }

  const getTotalValue = (invs: Investment[]) =>
    invs.reduce((sum, inv) => sum + parseFloat(inv.currentValue || inv.amount), 0);

  const getTotalYield = (invs: Investment[]) =>
    invs.reduce((sum, inv) => sum + parseFloat(inv.yieldEarned || "0"), 0);

  const combinedTotalValue = getTotalValue(activeInvestments) + vaultPositionValue;
  const combinedTotalYield = getTotalYield(activeInvestments);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Positions</p>
          <p className="mt-2 font-display text-3xl font-bold text-brand-black">
            {activeInvestments.length + (hasVaultPosition ? 1 : 0)}
          </p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Deployed</p>
          <p className="mt-2 font-display text-3xl font-bold text-brand-black">
            ${combinedTotalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="surface-card rounded-2xl p-5 bg-emerald-50/70 border border-emerald-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Yield</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-700">
            ${combinedTotalYield.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {hasVaultPosition && (
        <div className="surface-card rounded-2xl border-2 border-brand-green p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Current vault position</p>
              <h4 className="mt-1 font-display text-2xl font-bold text-brand-black">
                {parseFloat(shares || "0").toLocaleString(undefined, { maximumFractionDigits: 4 })} shares
              </h4>
              <p className="mt-2 text-sm text-neutral-600">
                Live value: <span className="font-semibold text-brand-black">${vaultPositionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="rounded-xl bg-brand-bg px-4 py-3 text-sm text-neutral-600">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Status</p>
              <p className="mt-1 font-semibold text-brand-green">Active on-chain</p>
              <p className="mt-2 text-xs text-neutral-500">This is the live USDC vault position for your connected wallet.</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-brand-black">Individual investments</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Each deposit shows up here as an on-chain entry. Click one to inspect its transaction trail.
            </p>
          </div>
        </div>

        {activeInvestments.length === 0 ? (
          <div className="surface-card rounded-2xl p-6 text-center">
            <p className="text-sm text-neutral-500">
              Your current vault position is live, but no historical deposit entries were found yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeInvestments.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvestment(inv)}
                className="surface-card rounded-2xl border border-brand-gray/70 p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Deposit</p>
                    <p className="mt-1 font-display text-xl font-bold text-brand-black">
                      ${parseFloat(inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(inv.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-semibold text-brand-green">
                    {inv.riskLevel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-gray/60 pt-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500">Current value</p>
                    <p className="mt-1 font-semibold text-brand-black">
                      ${parseFloat(inv.currentValue || inv.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500">Yield</p>
                    <p className="mt-1 font-semibold text-emerald-600">
                      +${parseFloat(inv.yieldEarned || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedInvestment && (
        <InvestmentDetail
          investment={selectedInvestment}
          onClose={() => setSelectedInvestment(null)}
        />
      )}
    </div>
  );
}
