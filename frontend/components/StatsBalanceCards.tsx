"use client";

import { useAccount, useBalance } from "wagmi";

const USDT_BASE =
  "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as const;

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

function formatBal(
  data: { formatted: string; symbol: string } | undefined,
  connected: boolean
) {
  if (!connected) return "—";
  if (!data) return "…";
  return `${Number(data.formatted).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} ${data.symbol}`;
}

export function StatsBalanceCards() {
  const { address, isConnected } = useAccount();
  const { data: usdtBal } = useBalance({
    address,
    token: USDT_BASE,
    query: { enabled: !!address },
  });
  const { data: ethBal } = useBalance({
    address,
    query: { enabled: !!address },
  });

  return (
    <section className="px-4 pb-14 sm:px-6 sm:pb-20" aria-label="Balances">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:gap-5">
        <div className="surface-card flex flex-1 items-center gap-5 p-6 transition duration-300 hover:scale-[1.02]">
          <CoinIcon label="₮" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              USDT balance
            </p>
            <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-brand-black sm:text-3xl">
              {formatBal(usdtBal, isConnected)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Base network</p>
          </div>
        </div>
        <div className="surface-card flex flex-1 items-center gap-5 p-6 transition duration-300 hover:scale-[1.02]">
          <CoinIcon label="Ξ" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Ethereum balance
            </p>
            <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-brand-black sm:text-3xl">
              {formatBal(ethBal, isConnected)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Native gas token</p>
          </div>
        </div>
      </div>
    </section>
  );
}
