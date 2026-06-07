"use client";

import { useAccount } from "wagmi";
import { StatCard } from "@/components/StatCard";
import { WalletOverview } from "@/components/WalletOverview";
import { ProtocolAllocation } from "@/components/ProtocolAllocation";
import { RiskAndFees } from "@/components/RiskAndFees";
import { CheckingDuration } from "@/components/CheckingDuration";
import { RebalanceTable } from "@/components/RebalanceTable";
import { InvestmentPortfolio } from "@/components/InvestmentPortfolio";
import { BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";
import { useVaultAPYs, useUserPositionValue } from "@/lib/hooks/useVaultData";
import { useHydrated } from "@/lib/hooks/useHydrated";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DashboardSection() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { blendedAPY, isLoading: apyLoading } = useVaultAPYs();
  const { positionValue, isLoading: positionLoading } = useUserPositionValue(address);

  return (
    <section
      id="dashboard"
      className="relative px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 max-w-4xl rounded-b-[40%] bg-white/60 dark:bg-neutral-900/60" />

      <div className="relative mx-auto max-w-6xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
          Live Vault Dashboard
        </p>
        <h2 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          Your USDC vault
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-neutral-600">
          Track where your USDC sits, how much is deployed, and when the router last rebalanced.
          This dashboard reads the live Base Sepolia contracts directly.
        </p>

        <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-gray/60 bg-white p-3 text-left shadow-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Vault</p>
            <p className="mt-1 text-xs font-mono text-brand-black">{shortAddress(BASE_SEPOLIA_DEPLOYMENT.vaultManager)}</p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-white p-3 text-left shadow-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Strategy</p>
            <p className="mt-1 text-xs font-mono text-brand-black">{shortAddress(BASE_SEPOLIA_DEPLOYMENT.strategyRouter)}</p>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-white p-3 text-left shadow-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Risk registry</p>
            <p className="mt-1 text-xs font-mono text-brand-black">{shortAddress(BASE_SEPOLIA_DEPLOYMENT.riskRegistry)}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-center text-sm font-semibold uppercase tracking-[0.1em] text-brand-green mb-4">
            Live position
          </h3>
          <InvestmentPortfolio />
        </div>

        {hydrated ? (
          <div className="mt-12 space-y-5">
            {/* Top row - Key metrics */}
            <div className="grid items-stretch gap-5 lg:grid-cols-4">
              <WalletOverview />
              <StatCard
                label="Blended vault APY"
                value={`${blendedAPY}%`}
                sub={apyLoading ? "Loading..." : "Average of live protocol APY reads"}
              />
              <StatCard
                label="Your position"
                value={positionValue && positionValue !== "0" ? `$${Number(positionValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                sub={positionLoading ? "Loading..." : "Vault shares and underlying USDC value"}
              />
              <ProtocolAllocation />
            </div>
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <RiskAndFees />
              <div className="surface-card rounded-2xl p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Position summary
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  This view shows the latest vault shares, live USDC value, and the current protocol split for the connected wallet. If history is empty, the vault still shows the current on-chain balance as the primary investment.
                </p>
              </div>
            </div>

            <div className="grid items-stretch gap-5 lg:grid-cols-1">
              <CheckingDuration />
            </div>
          </div>
        ) : (
          // Server render / loading skeleton
          <div className="mt-12 space-y-5">
            <div className="grid items-stretch gap-5 lg:grid-cols-4">
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
            </div>
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
            </div>
            <div className="grid items-stretch gap-5 lg:grid-cols-1">
              <div className="surface-card h-40 animate-pulse bg-neutral-100" />
            </div>
          </div>
        )}

        {hydrated ? (
          <div className="mt-8">
            <RebalanceTable />
          </div>
        ) : (
          <div className="mt-8 h-64 animate-pulse bg-neutral-100 rounded-2xl" />
        )}
      </div>
    </section>
  );
}
