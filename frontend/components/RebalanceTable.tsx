"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useRebalanceHistory } from "@/lib/hooks/useRebalanceHistory";
import { useForceRebalance } from "@/lib/hooks/useForceRebalance";
import { useCanRebalance } from "@/lib/hooks/useRiskRegistry";
import { useHydrated } from "@/lib/hooks/useHydrated";

const EXPLORER = "https://sepolia.basescan.org";

export function RebalanceTable() {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const {
    aaveBalance,
    compoundBalance,
    morphoBalance,
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    total,
  } = useUserPositionBreakdown(hydrated ? address : undefined);
  const { history, isLoading } = useRebalanceHistory();
  const { forceRebalance, isLoading: rebalancing, error: rebalanceError, success: rebalanceSuccess, txHash: rebalanceTxHash } = useForceRebalance();
  const { canRebalance } = useCanRebalance(hydrated ? address : undefined);
  const showMorpho = parseFloat(morphoBalance || "0") > 0 || Number(morphoPercentage) > 0;
  const [showRebalanceConfirm, setShowRebalanceConfirm] = useState(false);

  const handleForceRebalance = async () => {
    try {
      await forceRebalance();
      setShowRebalanceConfirm(false);
    } catch {
      // error is set by the hook
    }
  };

  return (
    <div className="space-y-5">
      {hydrated && (
        <div className="surface-card rounded-2xl p-5">
          <h3 className="mb-1 text-sm font-semibold text-brand-black">Current protocol split</h3>
          <p className="mb-4 text-xs text-neutral-500">
            Live allocation across Aave, Compound, and Morpho for your connected wallet.
          </p>

          {parseFloat(total) > 0 ? (
            <div className="space-y-4">
              {/* Aave */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-brand-black">Aave v3</span>
                  </div>
                  <span className="text-xs font-bold text-brand-black">
                    ${parseFloat(aaveBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-700 ease-out"
                    style={{ width: `${aavePercentage}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[10px] text-neutral-600 dark:text-neutral-400">{aavePercentage}%</div>
              </div>

              {/* Compound */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-brand-black">Compound v3</span>
                  </div>
                  <span className="text-xs font-bold text-brand-black">
                    ${parseFloat(compoundBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-green-100 dark:bg-green-900/40">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all duration-700 ease-out"
                    style={{ width: `${compoundPercentage}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[10px] text-neutral-600 dark:text-neutral-400">{compoundPercentage}%</div>
              </div>

              {/* Morpho */}
              {showMorpho && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-violet-500" />
                      <span className="text-xs font-semibold text-brand-black">Morpho Blue</span>
                    </div>
                    <span className="text-xs font-bold text-brand-black">
                      ${parseFloat(morphoBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-violet-100 dark:bg-violet-900/40">
                    <div
                      className="h-2 rounded-full bg-violet-500 transition-all duration-700 ease-out"
                      style={{ width: `${morphoPercentage}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-neutral-600 dark:text-neutral-400">{morphoPercentage}%</div>
                </div>
              )}

              <div className="border-t border-brand-gray pt-3 dark:border-neutral-600">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">Total in protocols</span>
                  <span className="text-sm font-bold text-brand-black">
                    ${parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              No protocol allocation yet. Deposit USDC with a strategy set to allocate across lending markets.
            </p>
          )}
        </div>
      )}

      <div className="surface-card rounded-2xl p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-black">Allocation &amp; rebalance history</h3>
            <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-brand-gray bg-brand-bg px-3 py-1 text-[10px] font-semibold text-brand-green dark:border-neutral-600 dark:bg-neutral-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden />
              Rebalances run via keeper automation
            </span>
          </div>
          {/* Force rebalance button */}
          {hydrated && address && parseFloat(total) > 0 && (
            <div className="flex items-center gap-2">
              {canRebalance && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ● Rebalance available
                </span>
              )}
              {!showRebalanceConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowRebalanceConfirm(true)}
                  disabled={rebalancing}
                  className="rounded-lg border border-brand-green/60 px-3 py-1.5 text-xs font-semibold text-brand-green transition hover:bg-brand-green/10 disabled:opacity-50"
                >
                  {rebalancing ? "Rebalancing…" : "Force rebalance"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleForceRebalance}
                    disabled={rebalancing}
                    className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green/90 disabled:opacity-50"
                  >
                    {rebalancing ? "Processing…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRebalanceConfirm(false)}
                    className="rounded-lg border border-brand-gray/60 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rebalance success/error */}
        {rebalanceSuccess && (
          <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400">
            ✓ {rebalanceSuccess}
            {rebalanceTxHash && (
              <a
                href={`${EXPLORER}/tx/${rebalanceTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 font-mono underline"
              >
                View tx ↗
              </a>
            )}
          </div>
        )}
        {rebalanceError && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400">
            ⚠ {rebalanceError}
          </div>
        )}

        <p className="mt-3 text-xs text-neutral-500">
          Shows initial deposit allocations and any on-chain rebalances when liquidity moves between protocols.
          Automatic rebalancing is executed by the protocol keeper based on your chosen rebalance frequency.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-brand-gray/80 text-neutral-500 dark:border-neutral-600">
                <th className="pb-2 pr-4 font-semibold">Time</th>
                <th className="pb-2 pr-4 font-semibold">From</th>
                <th className="pb-2 pr-4 font-semibold">To</th>
                <th className="pb-2 pr-4 font-semibold">Amount</th>
                <th className="pb-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="text-neutral-700 dark:text-neutral-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-neutral-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
                      Loading on-chain history…
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-neutral-500">
                    <div className="space-y-2">
                      <p className="font-semibold text-neutral-600 dark:text-neutral-400">No allocation or rebalance events yet</p>
                      <p>After you deposit with a strategy, the initial split will appear here.</p>
                      <p className="text-[10px]">
                        Rebalance events are created when the keeper or a user triggers a reallocation between
                        Aave, Compound, and Morpho based on live APY comparison.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="border-b border-brand-gray/40 dark:border-neutral-700">
                    <td className="py-3 pr-4 text-neutral-500">{entry.when}</td>
                    <td className="py-3 pr-4">{entry.from}</td>
                    <td className="py-3 pr-4">{entry.to}</td>
                    <td className="py-3 pr-4 font-mono text-sm text-brand-black">{entry.amount}</td>
                    <td className="py-3 text-neutral-500">
                      <span>{entry.reason}</span>
                      {/* Show tx link if ID looks like a hash */}
                      {entry.id && entry.id.startsWith("0x") && (
                        <a
                          href={`${EXPLORER}/tx/${entry.id.split("-")[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-brand-green hover:underline"
                        >
                          ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
