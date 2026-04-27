"use client";

import { useAccount, useBalance } from "wagmi";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useStablecoinBalances } from "@/lib/hooks/useStablecoinBalances";

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function WalletOverview() {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { balances, options, isLoading, totalApproxUsd } =
    useStablecoinBalances();

  const { data: ethBal, isLoading: ethLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    query: {
      enabled: !!address && hydrated,
      refetchInterval: 10_000,
    },
  });

  return (
    <div className="space-y-3">
      {!isConnected || !address ? (
        <div className="surface-card rounded-2xl p-6">
          <p className="text-sm text-neutral-600">
            Connect a wallet on Base Sepolia to see your balances.
          </p>
        </div>
      ) : (
        <>
          <div className="surface-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Stablecoins in wallet
            </h3>
            <p className="mt-1 font-mono text-lg font-bold text-brand-black">
              ≈ ${fmtUsd(totalApproxUsd)}
              <span className="ml-1 text-xs font-normal text-neutral-500">
                (USDC+USDT+DAI)
              </span>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {options.map((o) => {
                const b = balances[o.id];
                const loading = isLoading && !b;
                return (
                  <div
                    key={o.id}
                    className="rounded-lg border border-brand-gray/40 bg-brand-bg/60 px-2 py-2"
                  >
                    <p className="text-[10px] font-semibold uppercase text-neutral-500">
                      {o.label}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-brand-black tabular-nums">
                      {loading
                        ? "…"
                        : fmtUsd(b ? Number(b.formatted) : 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="surface-card rounded-2xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                ETH (gas)
              </h3>
              <p className="font-display text-2xl font-bold text-brand-black leading-tight">
                {!hydrated ? (
                  <span className="text-neutral-400 text-sm">—</span>
                ) : ethLoading ? (
                  <span className="text-neutral-400 text-sm">Loading</span>
                ) : ethBal?.formatted ? (
                  `${Number(ethBal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}`
                ) : (
                  "0"
                )}
              </p>
            </div>

            <div className="surface-card rounded-2xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                Wallet
              </h3>
              <p className="font-mono text-xs text-brand-black break-all font-medium">
                {shorten(address)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
