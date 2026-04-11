"use client";

const aavePct = 42;
const compoundPct = 58;

export function ProtocolAllocation() {
  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <h3 className="text-sm font-semibold text-brand-black">Allocation</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Weighted by live APY (demo snapshot)
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs font-medium">
            <span className="text-neutral-600">Aave v3</span>
            <span className="text-brand-black">{aavePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-gray/70">
            <div
              className="h-full rounded-full bg-brand-green"
              style={{ width: `${aavePct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-medium">
            <span className="text-neutral-600">Compound v3</span>
            <span className="text-brand-black">{compoundPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-gray/70">
            <div
              className="h-full rounded-full bg-brand-black"
              style={{ width: `${compoundPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Aave APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            4.9%
          </p>
        </div>
        <div className="rounded-2xl border border-brand-gray/60 bg-brand-bg py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Compound APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            6.4%
          </p>
        </div>
      </div>
    </div>
  );
}
