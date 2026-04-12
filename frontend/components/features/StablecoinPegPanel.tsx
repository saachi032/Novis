"use client";

/** Demo peg vs $1.00 (basis points) — illustrative until oracle-backed UI */
const STABLES = [
  {
    symbol: "USDC",
    name: "USD Coin",
    pegBps: 0.8,
    vol: "Low",
    chain: "Base",
  },
  {
    symbol: "USDT",
    name: "Tether",
    pegBps: 1.2,
    vol: "Low",
    chain: "Base",
  },
  {
    symbol: "DAI",
    name: "Maker DAI",
    pegBps: 2.4,
    vol: "Low",
    chain: "Base",
  },
];

export function StablecoinPegPanel() {
  return (
    <div className="surface-card flex h-full min-h-[20rem] flex-col p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-black">
            Stablecoin reference vs USD
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Implied $1.00 peg deviation (basis points, demo). Compare how each
            stable tracks the dollar; vault strategy earns on USDC after any zap.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gray bg-brand-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          Demo rates
        </span>
      </div>
      <ul className="mt-6 space-y-5">
        {STABLES.map((s) => {
          const barPct = Math.min(100, (s.pegBps / 5) * 100);
          return (
            <li key={s.symbol} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-gray bg-brand-bg text-xs font-bold text-brand-green">
                {s.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-brand-black">
                    {s.symbol}
                  </span>
                  <span className="text-xs text-neutral-500">{s.chain}</span>
                </div>
                <p className="text-[11px] text-neutral-500">{s.name}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-gray/60">
                    <div
                      className="h-full rounded-full bg-brand-green/80"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-brand-black">
                    {s.pegBps.toFixed(1)} bps
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-neutral-400">
                  Volatility: {s.vol} · 1 {s.symbol} ≈ $1.00
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
