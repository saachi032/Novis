"use client";

import { useAccount, useBalance } from "wagmi";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useStablecoinBalances } from "@/lib/hooks/useStablecoinBalances";

function CoinIcon({ label }: { label: string }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-gray bg-brand-bg text-xs font-bold text-brand-green"
      aria-hidden
    >
      {label}
    </div>
  );
}

function formatStableLine(
  symbol: string,
  amount: string | undefined,
  connected: boolean,
  hydrated: boolean,
  loading: boolean
) {
  if (!hydrated) return "—";
  if (!connected) return "—";
  if (loading) return "…";
  if (amount === undefined) return `0 ${symbol}`;
  return `${Number(amount).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} ${symbol}`;
}

export function StatsBalanceCards() {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { balances, options, isLoading: stablesLoading } =
    useStablecoinBalances();

  const { data: ethBal } = useBalance({
    address: hydrated ? address : undefined,
    query: { enabled: hydrated && !!address },
  });

  return (
    <section className="px-4 pb-14 sm:px-6 sm:pb-20" aria-label="Balances">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((o) => {
          const b = balances[o.id];
          return (
            <div
              key={o.id}
              className="surface-card flex flex-1 items-center gap-5 p-6 transition duration-300 hover:scale-[1.02]"
            >
              <CoinIcon label={o.label.slice(0, 2)} />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {o.label} balance
                </p>
                <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-brand-black sm:text-3xl">
                  {formatStableLine(
                    o.label,
                    b?.formatted,
                    isConnected,
                    hydrated,
                    stablesLoading && !b
                  )}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Base (Sepolia / mainnet)</p>
              </div>
            </div>
          );
        })}
        <div className="surface-card flex flex-1 items-center gap-5 p-6 transition duration-300 hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
          <CoinIcon label="Ξ" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Ethereum balance
            </p>
            <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-brand-black sm:text-3xl">
              {!hydrated || !isConnected
                ? "—"
                : ethBal
                  ? `${Number(ethBal.formatted).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })} ETH`
                  : "…"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Gas token</p>
          </div>
        </div>
      </div>
    </section>
  );
}
