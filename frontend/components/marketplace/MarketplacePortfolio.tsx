"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useTotalAssets, useUserVaultShares, useVaultAPYs, useUserPositionValue } from "@/lib/hooks/useVaultData";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { parseDepositHistory } from "@/lib/utils/depositHistory";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function MarketplacePortfolio() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { totalAssets } = useTotalAssets();
  const { shares } = useUserVaultShares(address);
  const { blendedAPY } = useVaultAPYs();
  const { positionValue } = useUserPositionValue(address);
  const { rawEvents } = useTransactionHistory();

  const shareBigInt = shares && shares !== "0" ? parseFloat(shares) : 0;
  const hasShares = shareBigInt > 0;

  const { totalDeposited } = useMemo(() => {
    return parseDepositHistory(rawEvents || []);
  }, [rawEvents]);

  // Determine if the user actually has an active position (either shares > 0, or they have deposited recently and waiting for sync)
  const hasPosition = hasShares || totalDeposited > 0;

  const totals = useMemo(() => {
    // Only show real data - no mock/demo data
    const currentValue = parseFloat(positionValue || "0");
    const deposited = totalDeposited; // True deposited amount
    const yieldUsd = currentValue > deposited ? currentValue - deposited : 0;
    const returnPct = deposited > 0 ? (yieldUsd / deposited) * 100 : 0;
    const avgApy = parseFloat(blendedAPY || "0");

    return {
      deposited,
      current: currentValue,
      yieldUsd,
      returnPct,
      avgApy,
    };
  }, [positionValue, totalDeposited, blendedAPY]);

  // Don't render hook-dependent content until after hydration
  if (!hydrated) {
    return (
      <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4 animate-pulse">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Total vault assets</p>
          <p className="mt-1 w-20 h-6 bg-neutral-200 rounded"></p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4 animate-pulse">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Your position</p>
          <p className="mt-1 w-20 h-6 bg-neutral-200 rounded"></p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4 animate-pulse">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Your yield</p>
          <p className="mt-1 w-20 h-6 bg-neutral-200 rounded"></p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4 animate-pulse">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Blended APY</p>
          <p className="mt-1 w-20 h-6 bg-neutral-200 rounded"></p>
        </div>
      </div>
    );
  }

  // If the user has withdrawn everything (shares are 0 and totalDeposited is 0), don't show the active position block.
  // Wait, if they withdrew everything, totalDeposited might be 0 but we still might want to show the empty state?
  // Let's use `hasPosition` for that.

  return (
    <>
      <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Total vault assets
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            {formatUsd(parseFloat(totalAssets || "0"))}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Your position
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            {hasPosition ? formatUsd(totals.current) : "—"}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Your yield
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-green">
            {hasPosition ? `+${formatUsd(totals.yieldUsd)}` : "—"}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Blended APY
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            {blendedAPY}%
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-bold text-brand-black">Your investments</h3>
        <p className="mt-1 text-xs text-neutral-500">
          {hasPosition ? (
            <>
              Real-time portfolio backed by smart contracts on Base Sepolia.
              Total vault assets: ${parseFloat(totalAssets || "0").toFixed(2)}
            </>
          ) : (
            "No investments yet. Connect your wallet and deposit USDC to start earning yield."
          )}
        </p>
        {hasPosition && shareBigInt > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-gray/80 bg-white shadow-soft">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-gray/60 bg-brand-bg/80 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Deposited</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Yield</th>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">APY</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-brand-gray/40 transition-colors hover:bg-brand-bg/80 cursor-pointer" onClick={() => window.location.href = '/marketplace/vault-usdc'}>
                  <td className="px-4 py-3">
                    <div className="text-left font-semibold text-brand-black">
                      Novis USDC Vault
                    </div>
                    <p className="text-[11px] text-neutral-500">
                    Aave v3 · Compound v3
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatUsd(totals.deposited)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-black">
                    {formatUsd(totals.current)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-green">
                    +{formatUsd(totals.yieldUsd)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    +{totals.returnPct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-black">
                    {blendedAPY}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-brand-gray/40 bg-brand-bg/30 p-6 text-center">
            <p className="text-xs text-neutral-600">
              Your vault positions will appear here once you deposit a supported stablecoin.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
