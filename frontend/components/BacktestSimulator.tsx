"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiStrategy = {
  label: string;
  finalCapital: number;
  profitPct: number;
  switches: number;
  history: number[];
};

type BacktestPayload = {
  apys: {
    aave: number;
    morpho: number;
  };
  gasCost: number;
  strategies: ApiStrategy[];
  projectedGain: number;
  switched: boolean;
};

const colorMap: Record<string, string> = {
  dynamic: "#34d399",
  "static-aave": "#60a5fa",
  "static-morpho": "#fbbf24",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

function LineChart({ series }: { series: ApiStrategy[] }) {
  if (!series.length) {
    return null;
  }

  const width = 640;
  const height = 220;
  const baselineValues = series.flatMap((item) => item.history);
  const maxValue = Math.max(...baselineValues);
  const minValue = Math.min(...baselineValues);
  const range = maxValue - minValue || 1;

  const renderPoints = (history: number[]) =>
    history
      .map((value, index) => {
        const x = (index / (history.length - 1 || 1)) * width;
        const y = height - ((value - minValue) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      <rect width="100%" height="100%" fill="transparent" />
      {series.map((item) => (
        <polyline
          key={item.label}
          points={renderPoints(item.history)}
          fill="none"
          stroke={colorMap[item.label] ?? "#94a3b8"}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <g stroke="#e5e7eb" strokeWidth="1">
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1="0"
            x2={width}
            y1={(height / 4) * row}
            y2={(height / 4) * row}
            strokeDasharray="4 4"
          />
        ))}
      </g>
    </svg>
  );
}

export function BacktestSimulator({ initialCapital = 1000 }: { initialCapital?: number }) {
  const [capitalTarget, setCapitalTarget] = useState(initialCapital);
  const [draftCapital, setDraftCapital] = useState(String(initialCapital));
  const [payload, setPayload] = useState<BacktestPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    fetch(`/api/backtest?capital=${capitalTarget}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Unable to run backtest");
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPayload(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [capitalTarget]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(draftCapital);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setCapitalTarget(parsed);
  };

  const summary = useMemo(() => {
    if (!payload) return null;
    const dynamic = payload.strategies.find((strategy) => strategy.label === "dynamic");
    return dynamic;
  }, [payload]);

  const chartData = payload?.strategies ?? [];

  return (
    <div className="w-full rounded-[32px] bg-white border border-neutral-200 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green">USDC optimizer</p>
          <h2 className="text-3xl font-bold text-brand-black">Aave v3 ↔ Morpho v1</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Live manifest from <span className="font-medium text-brand-white">defiyeildpool.json</span>. The
            backtest reruns each time you change the capital or rebalance settings.
          </p>
        </div>
        <form className="flex w-full flex-col gap-2 md:w-auto" onSubmit={handleSubmit}>
          <label className="text-sm text-neutral-600">Starting capital (USD)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={100}
              step={50}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none" value={draftCapital}
              onChange={(event) => setDraftCapital(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
            >
              Re-run
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4">        {loading && (
        <div className="flex h-56 items-center justify-center text-sm text-white/60">running simulation...</div>
      )}
        {error && (
          <div className="flex h-56 items-center justify-center text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-brand-light p-4">
              <LineChart series={chartData} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {chartData.map((strategy) => (
                <div
                  key={strategy.label}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black"
                >
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                    {strategy.label.replace("static-", "").toUpperCase()}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(strategy.finalCapital)}</p>
                  <p className="text-sm text-white/60">
                    Profit {formatPercent(strategy.profitPct)} • {strategy.switches} rebalance{" "}
                    {strategy.switches === 1 ? "event" : "events"}
                  </p>
                </div>
              ))}
            </div>
            {summary && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-brand-green/30 bg-brand-light p-4 text-brand-green">
                  <p className="text-sm uppercase tracking-[0.3em]">Projected gain</p>
                  <p className="mt-1 text-2xl font-semibold">{formatPercent(summary.profitPct)}</p>
                  <p className="text-xs text-white/60">after 30-day simulated window</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black">
                   <p className="text-sm text-white/60">APY • Aave v3</p>
                  <p className="text-xl font-semibold">{formatPercent((payload?.apys.aave ?? 0) * 100)}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black">
                  <p className="text-sm text-white/60">APY • Morpho v1</p>
                  <p className="text-xl font-semibold">{formatPercent((payload?.apys.morpho ?? 0) * 100)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
