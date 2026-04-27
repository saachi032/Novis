"use client";

import type { MockInvestment } from "@/components/marketplace/mockInvestments";

type Props = {
  investment: MockInvestment | null;
  onClose: () => void;
};

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export function InvestmentDetailModal({ investment, onClose }: Props) {
  if (!investment) return null;

  const maxBar = Math.max(...investment.monthlyYield, 1);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-detail-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-brand-gray/80 bg-white p-6 shadow-card sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-brand-gray bg-brand-bg text-neutral-500 hover:text-brand-black"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2
          id="inv-detail-title"
          className="pr-10 font-display text-xl font-bold text-brand-black"
        >
          {investment.name}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">{investment.protocol}</p>
        <p className="mt-1 text-[11px] font-medium text-brand-green">
          {investment.chain}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-3">
            <dt className="text-[10px] font-semibold uppercase text-neutral-500">
              Deposited
            </dt>
            <dd className="mt-1 font-display font-bold text-brand-black">
              {formatUsd(investment.deposited)}
            </dd>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-3">
            <dt className="text-[10px] font-semibold uppercase text-neutral-500">
              Current value
            </dt>
            <dd className="mt-1 font-display font-bold text-brand-black">
              {formatUsd(investment.currentValue)}
            </dd>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-3">
            <dt className="text-[10px] font-semibold uppercase text-neutral-500">
              APY
            </dt>
            <dd className="mt-1 font-display font-bold text-brand-green">
              {investment.apy.toFixed(2)}%
            </dd>
          </div>
          <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg p-3">
            <dt className="text-[10px] font-semibold uppercase text-neutral-500">
              Total return
            </dt>
            <dd className="mt-1 font-display font-bold text-brand-black">
              +{investment.returnPct.toFixed(2)}%
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Yield accrued (6 mo, demo)
          </h3>
          <div className="mt-4 flex h-44 items-end justify-between gap-2 border-b border-brand-gray/40 pb-1">
            {investment.monthlyYield.map((v, i) => (
              <div
                key={MONTHS[i]}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div
                  className="w-full max-w-[2.75rem] rounded-t-lg bg-brand-green/85"
                  style={{
                    height: `${Math.max(10, (v / maxBar) * 132)}px`,
                  }}
                  title={formatUsd(v)}
                />
                <span className="text-[10px] font-medium text-neutral-500">
                  {MONTHS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Venue allocation
          </h3>
          <ul className="mt-3 space-y-3">
            {investment.venueSplit.map((v) => (
              <li key={v.label}>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span className="text-brand-black">{v.label}</span>
                  <span className="text-neutral-600">{v.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-gray/50">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${v.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
