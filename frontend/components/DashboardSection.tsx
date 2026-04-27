"use client";

import { useAccount } from "wagmi";
import { StatCard } from "@/components/StatCard";
import { WalletOverview } from "@/components/WalletOverview";
import { ProtocolAllocation } from "@/components/ProtocolAllocation";
import { ProtocolBreakdown } from "@/components/ProtocolBreakdown";
import { RiskAndFees } from "@/components/RiskAndFees";
import { CheckingDuration } from "@/components/CheckingDuration";
import { RebalanceTable } from "@/components/RebalanceTable";
import { InvestmentPortfolio } from "@/components/InvestmentPortfolio";
import { MarketplacePortfolio } from "@/components/marketplace/MarketplacePortfolio";
import { useVaultAPYs, useUserPositionValue } from "@/lib/hooks/useVaultData";
import { useHydrated } from "@/lib/hooks/useHydrated";

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
          Marketplace
        </p>
        <h2 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          Your portfolio
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-neutral-600">
          Track positions, yield, and returns. Use{" "}
          <strong className="font-semibold text-brand-black">Buy</strong> to
          deposit and <strong className="font-semibold text-brand-black">Sell &amp; Trade</strong>{" "}
          to withdraw.
        </p>

        {/* Individual Investments Section */}
        <div className="mt-8">
          <h3 className="text-center text-sm font-semibold uppercase tracking-[0.1em] text-brand-green mb-4">
            Individual Investments
          </h3>
          <InvestmentPortfolio />
        </div>

        <MarketplacePortfolio />

        {hydrated ? (
          <div className="mt-12 space-y-5">
            {/* Top row - Key metrics */}
            <div className="grid items-stretch gap-5 lg:grid-cols-4">
              <WalletOverview />
              <StatCard
                label="Blended vault APY"
                value={`${blendedAPY}%`}
                sub={
                  apyLoading
                    ? "Loading..."
                    : "Same headline yield for USD value after USDC/USDT/DAI entry"
                }
              />
              <StatCard
                label="Your position"
                value={positionValue && positionValue !== "0" ? `$${Number(positionValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                sub={
                  positionLoading
                    ? "Loading..."
                    : "Vault shares (ERC-4626); underlying is USDC"
                }
              />
              <ProtocolBreakdown />
            </div>
            
            {/* Middle row - Allocation & Risk */}
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <ProtocolAllocation />
              <RiskAndFees />
            </div>
            
            {/* Bottom row - Checking Duration */}
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
