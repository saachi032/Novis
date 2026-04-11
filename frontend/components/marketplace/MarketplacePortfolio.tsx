"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MOCK_INVESTMENTS } from "@/components/marketplace/mockInvestments";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function MarketplacePortfolio() {
  const totals = useMemo(() => {
    const deposited = MOCK_INVESTMENTS.reduce((s, i) => s + i.deposited, 0);
    const current = MOCK_INVESTMENTS.reduce((s, i) => s + i.currentValue, 0);
    const yieldUsd = MOCK_INVESTMENTS.reduce((s, i) => s + i.yieldUsd, 0);
    const returnPct = deposited > 0 ? ((current - deposited) / deposited) * 100 : 0;
    const avgApy =
      MOCK_INVESTMENTS.reduce((s, i) => s + i.apy, 0) /
      MOCK_INVESTMENTS.length;
    return { deposited, current, yieldUsd, returnPct, avgApy };
  }, []);

  return (
    <>
      <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Total invested
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            {formatUsd(totals.deposited)}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Current value
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            {formatUsd(totals.current)}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Lifetime yield
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-green">
            +{formatUsd(totals.yieldUsd)}
          </p>
        </div>
        <div className="surface-card flex h-full min-h-[7.75rem] flex-col justify-between p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Blended return / APY
          </p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">
            +{totals.returnPct.toFixed(2)}% · {totals.avgApy.toFixed(2)}% APY
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-bold text-brand-black">Your investments</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Demo portfolio. Open any position for a full-page breakdown with
          yield bars and venue split. Replace with on-chain balances when wired.
        </p>
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
              {MOCK_INVESTMENTS.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-brand-gray/40 transition-colors hover:bg-brand-bg/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketplace/${inv.id}`}
                      className="text-left font-semibold text-brand-black underline-offset-2 hover:underline"
                    >
                      {inv.name}
                    </Link>
                    <p className="text-[11px] text-neutral-500">{inv.protocol}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatUsd(inv.deposited)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatUsd(inv.currentValue)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-green">
                    +{formatUsd(inv.yieldUsd)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-brand-black">
                    +{inv.returnPct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">{inv.apy.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
