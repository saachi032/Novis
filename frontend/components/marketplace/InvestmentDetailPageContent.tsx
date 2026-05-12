"use client";

import { useAccount } from "wagmi";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTotalAssets, useUserPositionValue, useUserVaultShares, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useUserStrategy } from "@/lib/hooks/useRiskRegistry";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type Props = {
  investmentId: string;
};

export function InvestmentDetailPageContent({ investmentId }: Props) {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { shares } = useUserVaultShares(address);
  const { positionValue } = useUserPositionValue(address);
  const { totalAssets } = useTotalAssets();
  const { blendedAPY, aaveAPY, compoundAPY, morphoAPY } = useVaultAPYs();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    total,
  } = useUserPositionBreakdown(hydrated ? address : undefined);
  const { riskLevel, duration } = useUserStrategy(hydrated ? address : undefined);

  const sharesNum = parseFloat(shares || "0");
  const positionNum = parseFloat(positionValue || "0");
  const totalAssetsNum = parseFloat(totalAssets || "0");
  const liveTotal = parseFloat(total || "0");

  const protocolRows = [
    { label: "Aave v3", amount: aaveBalance, pct: aavePercentage, color: "bg-blue-500" },
    { label: "Compound v3", amount: compoundBalance, pct: compoundPercentage, color: "bg-emerald-500" },
    { label: "Morpho Blue", amount: morphoBalance, pct: morphoPercentage, color: "bg-violet-500" },
  ].filter((row) => parseFloat(row.amount || "0") > 0 || Number(row.pct || 0) > 0);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="surface-card rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-3 border-b border-brand-gray/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
              Live Vault
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-brand-black">
              Novis USDC Vault
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              {investmentId} shows the live on-chain position for your connected wallet.
              This page reflects the vault share balance, strategy split, and APY data fetched
              from Base Sepolia.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Connection
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-black">
              {isConnected ? "Wallet connected" : "Connect wallet"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Vault shares</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">
              {sharesNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Position value</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">
              {formatUsd(positionNum)}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Total vault assets</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-black">
              {formatUsd(totalAssetsNum)}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Blended APY</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand-green">
              {blendedAPY}%
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-brand-gray/60 p-5">
            <p className="text-sm font-semibold text-brand-black">Current strategy</p>
            <p className="mt-2 text-sm text-neutral-600">
              Risk level: <span className="font-semibold text-brand-black">{riskLevel}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Rebalance frequency: <span className="font-semibold text-brand-black">{duration}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Live APYs: Aave {aaveAPY}% · Compound {compoundAPY}% · Morpho {morphoAPY}%
            </p>
          </div>

          <div className="rounded-2xl border border-brand-gray/60 p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-brand-black">Protocol allocation</p>
            {liveTotal === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">
                No active position yet. Make a deposit to see the live split here.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {protocolRows.map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-neutral-600">{row.label}</span>
                      <span className="text-brand-black">
                        {row.amount} USDC {typeof row.pct === "number" ? `· ${row.pct}%` : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-gray/60">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-gray/60 bg-brand-bg/60 p-5">
          <p className="text-sm font-semibold text-brand-black">What you are seeing</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            This page is tied to the connected wallet. It does not invent allocations from a template.
            The displayed numbers come from the vault share balance and the strategy router balances on chain.
          </p>
        </div>
      </div>
    </section>
  );
}
