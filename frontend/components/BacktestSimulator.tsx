"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ApiStrategy = {
  label: string;
  finalCapital: number;
  profitPct: number;
  switches: number;
  history: number[];
};

type ApyRow = { day: string; aave: number; compound: number; morpho: number };

type SwitchEvent = { day: string; index: number; reason: string };

type SimulationParams = {
  riskLevel: string;
  rebalanceIntervalDays: number;
  effectiveApyThreshold: number;
  effectiveCooldownDays: number;
  timeWindowDays: number;
  gasCostUsd: number;
};

type BacktestPayload = {
  apys: {
    aave: number;
    compound: number;
    morpho: number;
  };
  gasCost: number;
  strategies: ApiStrategy[];
  initialCapital: number;
  apySeries: ApyRow[];
  switchEvents: SwitchEvent[];
  projectedGainSample: number;
  simulationParams: SimulationParams;
};

const colorMap: Record<string, string> = {
  dynamic: "#10b981",
  "static-aave": "#60a5fa",
  "static-compound": "#f97316",
  "static-morpho": "#8b5cf6",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

function buildQuery(capital: number, risk: string, interval: number): string {
  const p = new URLSearchParams();
  p.set("capital", String(capital));
  p.set("riskLevel", risk);
  p.set("intervalDays", String(interval));
  return p.toString();
}

export function BacktestSimulator({ initialCapital = 1000 }: { initialCapital?: number }) {
  const [capitalTarget, setCapitalTarget] = useState(initialCapital);
  const [draftCapital, setDraftCapital] = useState(String(initialCapital));
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("medium");
  const [intervalDays, setIntervalDays] = useState(1);
  const [payload, setPayload] = useState<BacktestPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    fetch(`/api/backtest?${buildQuery(capitalTarget, riskLevel, intervalDays)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || "Unable to run backtest");
        }
        return res.json() as Promise<BacktestPayload>;
      })
      .then((data) => {
        if (isMounted) {
          setPayload(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof Error && err.name === "AbortError") return;
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
  }, [capitalTarget, riskLevel, intervalDays]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(draftCapital);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    setError(null);
    setCapitalTarget(parsed);
  };

  const summary = useMemo(() => {
    if (!payload) return null;
    return payload.strategies.find((strategy) => strategy.label === "dynamic") ?? null;
  }, [payload]);

  const chartStrategies = payload?.strategies ?? [];

  const apyChartData = useMemo(() => {
    if (!payload?.apySeries.length) return [];
    return payload.apySeries.map((r, i) => ({
      day: r.day,
      idx: i,
      aavePct: Number((r.aave * 100).toFixed(4)),
      compoundPct: Number((r.compound * 100).toFixed(4)),
      morphoPct: Number((r.morpho * 100).toFixed(4)),
      maxPct: Number((Math.max(r.aave, r.compound, r.morpho) * 100).toFixed(4)),
    }));
  }, [payload?.apySeries]);

  const capitalChartData = useMemo(() => {
    if (!payload?.apySeries.length) return [];
    const dyn = chartStrategies.find((s) => s.label === "dynamic");
    const sa = chartStrategies.find((s) => s.label === "static-aave");
    const sc = chartStrategies.find((s) => s.label === "static-compound");
    const sm = chartStrategies.find((s) => s.label === "static-morpho");
    if (!dyn?.history.length) return [];
    return dyn.history.map((v, i) => ({
      day: payload.apySeries[i]?.day ?? String(i),
      dynamic: v,
      staticAave: sa?.history[i],
      staticCompound: sc?.history[i],
      staticMorpho: sm?.history[i],
    }));
  }, [payload, chartStrategies]);

  const sim = payload?.simulationParams;

  return (
    <div className="w-full rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green">USDC optimizer</p>
          <h2 className="text-3xl font-bold text-brand-black">Aave v3 · Compound v3 · Morpho</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Historical APY from DefiLlama drives a daily simulation across three USDC venues. Capital curves and APYs
            use the same aligned series as the API. Adjust risk and how often the strategy may re-check for a move;
            use the brush under each chart to zoom the time window.
          </p>
        </div>

        <form
          className="grid w-full gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2 lg:w-[420px] lg:shrink-0"
          onSubmit={handleSubmit}
        >
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-neutral-600">Starting capital (USD)</label>
            <input
              type="number"
              min={100}
              step={50}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-black focus:border-brand-green focus:outline-none"
              value={draftCapital}
              onChange={(e) => setDraftCapital(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Risk level</label>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-black focus:border-brand-green focus:outline-none"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low — wider APY band, longer cooldown</option>
              <option value="medium">Medium — balanced</option>
              <option value="high">High — tighter APY band, shorter cooldown</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Rebalance check interval (days)</label>
            <select
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-black focus:border-brand-green focus:outline-none"
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
            >
              {[1, 3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  Every {d} day{d === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-green py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
            >
              Apply capital
            </button>
            <p className="mt-1 text-center text-[11px] text-neutral-500">
              Risk and interval refetch automatically. Capital updates when you press Apply capital.
            </p>
          </div>
        </form>
      </div>

      {sim && !loading && payload && (
        <div className="mt-4 grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold text-neutral-600">Risk:</span> {sim.riskLevel}
          </p>
          <p>
            <span className="font-semibold text-neutral-600">Check interval:</span> {sim.rebalanceIntervalDays}d
          </p>
          <p>
            <span className="font-semibold text-neutral-600">APY floor (effective):</span>{" "}
            {(sim.effectiveApyThreshold * 100).toFixed(3)}% / yr spread
          </p>
          <p>
            <span className="font-semibold text-neutral-600">Cooldown (effective):</span> {sim.effectiveCooldownDays}d
            · Gas ${sim.gasCostUsd} · Gain window {sim.timeWindowDays}d
          </p>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4">
        {loading && (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-neutral-500">
            Running simulation…
          </div>
        )}
        {error && (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && payload && (
          <div className="space-y-8">
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Supply APY</p>
                  <p className="text-sm text-neutral-600">
                    Lines from the aligned pool history. Green dots: simulated profitable switch (after gas).
                  </p>
                </div>
                <p className="text-xs text-neutral-500">Drag the brush to zoom · scroll wheel zooms in many browsers</p>
              </div>
              <div className="mt-3 h-[52vh] min-h-[380px] max-h-[560px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={apyChartData} margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [`${Number(v ?? 0).toFixed(3)}%`, ""]}
                      labelFormatter={(l) => l}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="aavePct" name="Aave v3" stroke="#60a5fa" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="compoundPct"
                      name="Compound v3"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="morphoPct"
                      name="Morpho"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    {payload.switchEvents.map((ev) => {
                      const row = apyChartData[ev.index];
                      if (!row) return null;
                      return (
                        <ReferenceDot
                          key={`${ev.day}-${ev.index}`}
                          x={row.day}
                          y={row.maxPct}
                          r={6}
                          fill="#059669"
                          stroke="#ecfdf5"
                          strokeWidth={2}
                        />
                      );
                    })}
                    <Brush dataKey="day" height={32} stroke="#10b981" travellerWidth={8} tickFormatter={() => ""} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Switch log</p>
              {payload.switchEvents.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">
                  No profitable rebalances in this window under the selected rules (interval, APY floor, cooldown, gas
                  vs projected gain).
                </p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm text-brand-black">
                  {payload.switchEvents.slice(-20).map((ev) => (
                    <li
                      key={`${ev.day}-${ev.index}`}
                      className="flex justify-between gap-3 border-b border-neutral-200/80 pb-2 last:border-0"
                    >
                      <span className="shrink-0 font-mono text-xs text-neutral-500">{ev.day}</span>
                      <span className="text-right text-neutral-700">{ev.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Capital (simulated)</p>
              <p className="text-sm text-neutral-600">
                Green: dynamic strategy using the rules above. Blue, orange, violet: stay 100% in one venue on the same
                daily APY path.
              </p>
              <div className="mt-3 h-[48vh] min-h-[340px] max-h-[520px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={capitalChartData} margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    />
                    <Tooltip
                      formatter={(v) => [formatCurrency(Number(v ?? 0)), ""]}
                      labelFormatter={(l) => l}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="dynamic"
                      name="Dynamic"
                      stroke={colorMap.dynamic}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="staticAave"
                      name="Static Aave"
                      stroke={colorMap["static-aave"]}
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="staticCompound"
                      name="Static Compound"
                      stroke={colorMap["static-compound"]}
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="staticMorpho"
                      name="Static Morpho"
                      stroke={colorMap["static-morpho"]}
                      strokeWidth={1.8}
                      dot={false}
                    />
                    <Brush dataKey="day" height={32} stroke="#10b981" travellerWidth={8} tickFormatter={() => ""} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {chartStrategies.map((strategy) => (
                <div
                  key={strategy.label}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black shadow-sm"
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    {strategy.label.replace("static-", "").replace("-", " ")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(strategy.finalCapital)}</p>
                  <p className="text-sm text-neutral-600">
                    Profit {formatPercent(strategy.profitPct)} · {strategy.switches} rebalance
                    {strategy.switches === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>

            {summary && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-brand-green/30 bg-emerald-50 p-4 text-brand-green">
                  <p className="text-sm uppercase tracking-[0.3em]">Dynamic profit</p>
                  <p className="mt-1 text-2xl font-semibold">{formatPercent(summary.profitPct)}</p>
                  <p className="text-xs text-neutral-600">Sample 7d gain (spot): ~{formatCurrency(payload.projectedGainSample)}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black">
                  <p className="text-sm text-neutral-600">Spot APY · Aave v3</p>
                  <p className="text-xl font-semibold">{formatPercent((payload.apys.aave ?? 0) * 100)}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black">
                  <p className="text-sm text-neutral-600">Spot APY · Compound v3</p>
                  <p className="text-xl font-semibold">{formatPercent((payload.apys.compound ?? 0) * 100)}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-brand-black">
                  <p className="text-sm text-neutral-600">Spot APY · Morpho</p>
                  <p className="text-xl font-semibold">{formatPercent((payload.apys.morpho ?? 0) * 100)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
