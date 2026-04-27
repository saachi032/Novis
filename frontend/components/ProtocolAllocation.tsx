"use client";

import { useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useHydrated } from "@/lib/hooks/useHydrated";

// Illustrative split across three venues (actual routing is APY + risk on-chain).
const AAVE_PCT = 34;
const COMPOUND_PCT = 33;
const MORPHO_PCT = 33;

export function ProtocolAllocation() {
  const hydrated = useHydrated();
  const { aaveAPY, compoundAPY, morphoAPY, isLoading } = useVaultAPYs();

  const aaveRate = !hydrated || isLoading ? "—" : `${aaveAPY}%`;
  const compoundRate = !hydrated || isLoading ? "—" : `${compoundAPY}%`;
  const morphoRate = !hydrated || isLoading ? "—" : `${morphoAPY}%`;

  return (
    <div className="surface-card h-full flex flex-col p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div>
        <h3 className="text-sm font-semibold text-brand-black">Allocation</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Weighted by current protocol APYs
        </p>
      </div>
      
      <div className="mt-5 flex-1 space-y-4">
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className="text-neutral-600">Aave v3</span>
            <span className="text-brand-black">{AAVE_PCT}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${AAVE_PCT}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className="text-neutral-600">Compound v3</span>
            <span className="text-brand-black">{COMPOUND_PCT}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${COMPOUND_PCT}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className="text-neutral-600">Morpho Blue</span>
            <span className="text-brand-black">{MORPHO_PCT}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${MORPHO_PCT}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Aave APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {aaveRate}
          </p>
        </div>
        <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Compound APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {compoundRate}
          </p>
        </div>
        <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Morpho APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {morphoRate}
          </p>
        </div>
      </div>
    </div>
  );
}
