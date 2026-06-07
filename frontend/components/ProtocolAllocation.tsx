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

  // Estimate annual yield per protocol
  const aaveYield = (parseFloat(aaveBalance || "0") * parseFloat(aaveAPY || "0") / 100);
  const compoundYield = (parseFloat(compoundBalance || "0") * parseFloat(compoundAPY || "0") / 100);
  const morphoYield = (parseFloat(morphoBalance || "0") * parseFloat(morphoAPY || "0") / 100);

  const fmtBal = (v: string) =>
    parseFloat(v || "0").toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  const fmtYield = (v: number) =>
    v > 0 ? `+$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr` : "";

  return (
    <div className="surface-card h-full flex flex-col p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div>
        <h3 className="text-sm font-semibold text-brand-black">Protocol allocation</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Live balances &amp; APY for your vault position
        </p>
      </div>
      
      <div className="mt-5 flex-1 space-y-4">
        {totalNum === 0 ? (
          <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/40 p-4 text-xs text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/40">
            No active position yet. Deposit USDC first to see a live allocation.
          </div>
        ) : (
          <>
            {/* Aave */}
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-neutral-600 dark:text-neutral-300">Aave v3</span>
                </div>
                <span className="text-brand-black">{aavePercentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                  style={{ width: `${aavePercentage}%` }}
                />
              </div>
            </div>

            {/* Compound */}
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-600 dark:text-neutral-300">Compound v3</span>
                </div>
                <span className="text-brand-black">{compoundPercentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${compoundPercentage}%` }}
                />
              </div>
            </div>

            {/* Morpho */}
            {showMorpho && (
              <div>
                <div className="mb-2 flex justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    <span className="text-neutral-600 dark:text-neutral-300">Morpho Blue</span>
                  </div>
                  <span className="text-brand-black">{morphoPercentage}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
                    style={{ width: `${morphoPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Protocol cards with APY + balance + yield */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 py-2.5 px-2 text-center dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-[10px] font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Aave
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {aaveRate}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
            ${fmtBal(aaveBalance)}
          </p>
          {aaveYield > 0.01 && (
            <p className="mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
              {fmtYield(aaveYield)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 py-2.5 px-2 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Compound
          </p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {compoundRate}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
            ${fmtBal(compoundBalance)}
          </p>
          {compoundYield > 0.01 && (
            <p className="mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
              {fmtYield(compoundYield)}
            </p>
          )}
        </div>
        {showMorpho ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 py-2.5 px-2 text-center dark:border-violet-800 dark:bg-violet-900/20">
            <p className="text-[10px] font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Morpho
            </p>
            <p className="mt-1 font-display text-lg font-bold text-brand-black">
              {morphoRate}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
              ${fmtBal(morphoBalance)}
            </p>
            {morphoYield > 0.01 && (
              <p className="mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                {fmtYield(morphoYield)}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-brand-gray/60 bg-brand-bg/30 py-2.5 px-2 text-center text-xs text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800/30">
            Morpho inactive
          </div>
        )}
      </div>

      {/* Total */}
      {totalNum > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-brand-gray/40 pt-3 dark:border-neutral-600">
          <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Total in protocols</span>
          <span className="text-sm font-bold text-brand-black">
            ${parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
