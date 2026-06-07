"use client";

import { useAccount } from "wagmi";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useHydrated } from "@/lib/hooks/useHydrated";

export function ProtocolBreakdown() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    total,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    isLoading,
  } = useUserPositionBreakdown(hydrated ? address : undefined);

  if (!hydrated || isLoading) {
    return (
      <div className="surface-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-bold text-brand-black">
          Protocol Allocation
        </h3>
        <div className="mt-4 h-40 animate-pulse bg-neutral-100 rounded-lg" />
      </div>
    );
  }

  const aaveNum = parseFloat(aaveBalance || "0");
  const compoundNum = parseFloat(compoundBalance || "0");
  const morphoNum = parseFloat(morphoBalance || "0");
  const showMorpho = morphoNum > 0 || Number(morphoPercentage) > 0;

  return (
    <div className="surface-card rounded-2xl p-6">
      <h3 className="font-display text-lg font-bold text-brand-black">
        Protocol Allocation
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        How your deposits are split between protocols
      </p>

      {aaveNum + compoundNum + morphoNum === 0 ? (
        <div className="mt-6 text-center py-8">
          <p className="text-sm text-neutral-500">No active position yet</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Aave Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-semibold text-brand-black">
                  Aave v3
                </span>
              </div>
              <span className="text-sm font-bold text-brand-black">
                ${aaveNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${aavePercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 text-right text-xs text-neutral-600">
              {aavePercentage}% of position
            </div>
          </div>

          {/* Compound Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-semibold text-brand-black">
                  Compound v3
                </span>
              </div>
              <span className="text-sm font-bold text-brand-black">
                ${compoundNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${compoundPercentage}%` }}
              ></div>
            </div>
            <div className="mt-1 text-right text-xs text-neutral-600">
              {compoundPercentage}% of position
            </div>
          </div>

          {showMorpho && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                  <span className="text-sm font-semibold text-brand-black">
                    Morpho Blue
                  </span>
                </div>
                <span className="text-sm font-bold text-brand-black">
                  ${morphoNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2.5">
                <div
                  className="bg-violet-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${morphoPercentage}%` }}
                ></div>
              </div>
              <div className="mt-1 text-right text-xs text-neutral-600">
                {morphoPercentage}% of position
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-brand-gray pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-600">
                Total Position
              </span>
              <span className="font-display text-lg font-bold text-brand-black">
                ${parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-[10px] font-semibold text-blue-900">
          💡 Tip: Rebalancing automatically moves funds to the protocol with higher APY
        </p>
      </div>
    </div>
  );
}
