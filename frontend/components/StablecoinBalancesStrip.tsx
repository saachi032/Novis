"use client";

import { useAccount, useBalance } from "wagmi";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useStablecoinBalances } from "@/lib/hooks/useStablecoinBalances";
import { useStablecoinPreferenceOptional } from "@/lib/context/StablecoinContext";
import type { StablecoinId } from "@/lib/constants/stablecoins";

type Props = {
  /** When true, clicking a row sets global deposit asset (if inside StablecoinProvider). */
  selectOnClick?: boolean;
  compact?: boolean;
};

function fmt(n: number, maxFrac = 4) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

export function StablecoinBalancesStrip({
  selectOnClick = false,
  compact = false,
}: Props) {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { balances, options, isLoading, totalApproxUsd } =
    useStablecoinBalances();
  const pref = useStablecoinPreferenceOptional();

  const { data: ethBal, isLoading: ethLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    query: {
      enabled: hydrated && !!address,
      refetchInterval: 12_000,
    },
  });

  if (!hydrated || !isConnected || !address) {
    return null;
  }

  const setAsset = (id: StablecoinId) => {
    if (selectOnClick && pref) pref.setSelectedAsset(id);
  };

  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "surface-card rounded-2xl p-4 sm:p-5"
      }
    >
      {!compact && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Wallet balances
          </p>
          <p className="font-mono text-sm font-semibold text-brand-black">
            ≈ ${fmt(totalApproxUsd, 2)} stable
          </p>
        </div>
      )}
      <div
        className={
          compact
            ? "flex flex-wrap gap-2"
            : "grid grid-cols-2 gap-3 sm:grid-cols-4"
        }
      >
        {options.length === 0 && (
          <p className="col-span-full text-sm text-neutral-500">
            Switch to Base Sepolia or Base mainnet to load stablecoin balances.
          </p>
        )}
        {options.map((o) => {
          const b = balances[o.id];
          const active = pref?.selectedAsset === o.id;
          const loading = isLoading && !b;
          const shellClass = `rounded-xl border px-3 py-2.5 text-left transition ${
            selectOnClick
              ? active
                ? "border-brand-green bg-brand-green/10 ring-1 ring-brand-green/30"
                : "border-brand-gray/60 bg-white hover:border-brand-gray cursor-pointer"
              : "border-brand-gray/40 bg-brand-bg/80 cursor-default"
          }`;
          const inner = (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {o.label}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold text-brand-black tabular-nums">
                {loading ? (
                  <span className="text-sm text-neutral-400">…</span>
                ) : (
                  fmt(b ? Number(b.formatted) : 0)
                )}
              </p>
            </>
          );
          return selectOnClick ? (
            <button
              key={o.id}
              type="button"
              onClick={() => setAsset(o.id)}
              className={shellClass}
            >
              {inner}
            </button>
          ) : (
            <div key={o.id} className={shellClass}>
              {inner}
            </div>
          );
        })}
        <div
          className={`rounded-xl border border-brand-gray/40 bg-brand-bg/80 px-3 py-2.5 ${
            compact ? "" : "col-span-2 sm:col-span-1"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            ETH (gas)
          </p>
          <p className="mt-0.5 font-display text-lg font-bold text-brand-black tabular-nums">
            {ethLoading ? (
              <span className="text-sm text-neutral-400">…</span>
            ) : (
              fmt(ethBal ? Number(ethBal.formatted) : 0, 5)
            )}
          </p>
        </div>
      </div>
      {selectOnClick && (
        <p className="mt-3 text-[11px] text-neutral-500">
          Tip: click a stablecoin to pre-select it for deposit below.
        </p>
      )}
    </div>
  );
}
