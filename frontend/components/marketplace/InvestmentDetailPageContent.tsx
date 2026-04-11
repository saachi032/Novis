import Link from "next/link";
import type { MockInvestment } from "@/components/marketplace/mockInvestments";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvestmentDetailPageContent({
  investment,
}: {
  investment: MockInvestment;
}) {
  const maxBar = Math.max(...investment.monthlyYield, 1);

  return (
    <section className="px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-sm font-semibold text-brand-green transition hover:text-[#3d5a56]"
        >
          ← Back to marketplace
        </Link>

        <div className="mt-6 surface-card overflow-hidden">
          <div className="border-b border-brand-gray/60 px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                  Portfolio Detail
                </p>
                <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
                  {investment.name}
                </h1>
                <p className="mt-2 text-base text-neutral-500">
                  {investment.protocol}
                </p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">
                  {investment.chain}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[24rem]">
                <div className="rounded-3xl border border-brand-gray/70 bg-brand-bg px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Current Value
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-brand-black">
                    {formatUsd(investment.currentValue)}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-gray/70 bg-brand-bg px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Total Return
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-brand-green">
                    +{investment.returnPct.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-brand-gray/70 bg-brand-bg p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Deposited
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-brand-black">
                    {formatUsd(investment.deposited)}
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-gray/70 bg-brand-bg p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    APY
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-brand-green">
                    {investment.apy.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-brand-gray/70 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                      Yield accrued
                    </h2>
                    <p className="mt-2 text-sm text-neutral-500">
                      Six-month demo performance for this position.
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-gray/70 bg-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    6 mo
                  </span>
                </div>

                <div className="mt-8 flex h-64 items-end justify-between gap-3 border-b border-brand-gray/50 pb-2">
                  {investment.monthlyYield.map((v, i) => (
                    <div
                      key={MONTHS[i]}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div
                        className="w-full max-w-[4.5rem] rounded-t-[1.5rem] bg-brand-green/75"
                        style={{
                          height: `${Math.max(20, (v / maxBar) * 180)}px`,
                        }}
                        title={formatUsd(v)}
                      />
                      <span className="text-xs font-medium text-neutral-500">
                        {MONTHS[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-brand-gray/70 bg-brand-bg p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                  Venue allocation
                </h2>
                <ul className="mt-5 space-y-4">
                  {investment.venueSplit.map((venue) => (
                    <li key={venue.label}>
                      <div className="mb-2 flex justify-between text-sm font-medium">
                        <span className="text-brand-black">{venue.label}</span>
                        <span className="text-neutral-600">{venue.pct}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-brand-gray/50">
                        <div
                          className="h-full rounded-full bg-brand-green"
                          style={{ width: `${venue.pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-brand-gray/70 bg-white p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                  Position notes
                </h2>
                <div className="mt-5 space-y-4 text-sm text-neutral-600">
                  <p>
                    This page is the full position view for the selected
                    investment, replacing the previous modal interaction.
                  </p>
                  <p>
                    The allocation and return figures are demo data for now and
                    can be swapped to on-chain reads once the contracts are wired.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/buy"
                  className="rounded-2xl bg-brand-green px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#486360]"
                >
                  Deposit more
                </Link>
                <Link
                  href="/sell"
                  className="rounded-2xl border border-brand-gray/80 bg-white px-4 py-3 text-center text-sm font-semibold text-brand-black transition hover:bg-brand-bg"
                >
                  Withdraw / trade
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
