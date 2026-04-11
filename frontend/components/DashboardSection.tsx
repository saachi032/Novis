"use client";

import { useAccount } from "wagmi";
import { StatCard } from "@/components/StatCard";
import { WalletOverview } from "@/components/WalletOverview";
import { ProtocolAllocation } from "@/components/ProtocolAllocation";
import { RiskAndFees } from "@/components/RiskAndFees";
import { CheckingDuration } from "@/components/CheckingDuration";
import { RebalanceTable } from "@/components/RebalanceTable";
import { MarketplacePortfolio } from "@/components/marketplace/MarketplacePortfolio";
import { useVaultAPYs, useUserPositionValue } from "@/lib/hooks/useVaultData";

export function DashboardSection() {
  const { address } = useAccount();
  const { blendedAPY, isLoading: apyLoading } = useVaultAPYs();
  const { positionValue, isLoading: positionLoading } = useUserPositionValue(address);

  return (
    <section
      id="dashboard"
      className="relative px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 max-w-4xl rounded-b-[40%] bg-white/60" />

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

        <MarketplacePortfolio />

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          <WalletOverview />
          <StatCard
            label="Blended vault APY"
            value={`${blendedAPY}%`}
            sub={apyLoading ? "Loading..." : "Weighted by protocol allocation"}
          />
          <StatCard
            label="Your position"
            value={positionValue && positionValue !== "0" ? `$${Number(positionValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            sub={positionLoading ? "Loading..." : "Deposit USDC to mint vault shares (ERC-4626)"}
          />
          <ProtocolAllocation />
          <RiskAndFees />
          <CheckingDuration />
        </div>

        <div className="mt-8">
          <RebalanceTable />
        </div>
      </div>
    </section>
  );
}
