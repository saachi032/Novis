"use client";

import { useAccount } from "wagmi";
import { useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useHydrated } from "@/lib/hooks/useHydrated";

export function ProtocolAllocation() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const { aaveAPY, compoundAPY, morphoAPY, isLoading } = useVaultAPYs();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    total,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
  } = useUserPositionBreakdown(hydrated ? address : undefined);

  const aaveRate = !hydrated || isLoading ? "—" : `${aaveAPY}%`;
  const compoundRate = !hydrated || isLoading ? "—" : `${compoundAPY}%`;
  const morphoRate = !hydrated || isLoading ? "—" : `${morphoAPY}%`;
  const totalNum = parseFloat(total || "0");
  const showMorpho = parseFloat(morphoBalance || "0") > 0 || Number(morphoPercentage) > 0;

  return (
    <div className="surface-card h-full flex flex-col p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div>
        <h3 className="text-sm font-semibold text-brand-black">Allocation</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Live protocol balances for your vault position
        </p>
      </div>
      
      <div className="mt-5 flex-1 space-y-4">
        {totalNum === 0 ? (
          <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/40 p-4 text-xs text-neutral-600">
            No active position yet. Deposit USDC first to see a live allocation.
          </div>
        ) : (
          <>
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <span className="text-neutral-600">Aave v3</span>
                <span className="text-brand-black">{aavePercentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${aavePercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <span className="text-neutral-600">Compound v3</span>
                <span className="text-brand-black">{compoundPercentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${compoundPercentage}%` }}
                />
              </div>
            </div>
            {showMorpho && (
              <div>
                <div className="mb-2 flex justify-between text-xs font-semibold">
                  <span className="text-neutral-600">Morpho Blue</span>
                  <span className="text-brand-black">{morphoPercentage}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-gray/70">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${morphoPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Aave APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {aaveRate}
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">{aaveBalance}</p>
        </div>
        <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Compound APY
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {compoundRate}
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">{compoundBalance}</p>
        </div>
        {showMorpho ? (
          <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/50 py-2.5 px-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Morpho APY
            </p>
            <p className="mt-1 font-display text-lg font-bold text-brand-black">
              {morphoRate}
            </p>
            <p className="mt-1 text-[10px] text-neutral-500">{morphoBalance}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/30 py-2.5 px-3 text-center text-xs text-neutral-500">
            Morpho inactive
          </div>
        )}
      </div>
    </div>
  );
}
