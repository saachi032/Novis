import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = path.resolve(process.cwd(), "../defiyeildpool.json");
const CHART_BASE = "https://yields.llama.fi/chart";

const GAS_COST_USD = 5;
const BASE_APY_THRESHOLD = 0.001;
const BASE_COOLDOWN_DAYS = 1;
const TIME_WINDOW_DAYS = 7;
const LOOKBACK_DAYS = 365;

type RiskLevel = "low" | "medium" | "high";

type PoolEntry = {
  project?: string;
  symbol?: string;
  pool?: string;
  apy?: number | null;
  tvlUsd?: number | null;
};

type ChartPoint = { timestamp?: number; apy?: number | null };

type ApiStrategy = {
  label: string;
  finalCapital: number;
  profitPct: number;
  switches: number;
  history: number[];
};

type Protocol = "aave" | "compound" | "morpho";

type ApyRow = { day: string; aave: number; compound: number; morpho: number };

type SwitchEvent = { day: string; index: number; reason: string };

type SimulationParams = {
  riskLevel: RiskLevel;
  rebalanceIntervalDays: number;
  effectiveApyThreshold: number;
  effectiveCooldownDays: number;
  timeWindowDays: number;
  gasCostUsd: number;
};

type BacktestResponse = {
  apys: { aave: number; compound: number; morpho: number };
  gasCost: number;
  strategies: ApiStrategy[];
  initialCapital: number;
  apySeries: ApyRow[];
  switchEvents: SwitchEvent[];
  projectedGainSample: number;
  simulationParams: SimulationParams;
};

const PROTO_ORDER: Protocol[] = ["aave", "compound", "morpho"];

function parseRiskLevel(raw: string | null): RiskLevel {
  const x = (raw ?? "medium").trim().toLowerCase();
  if (x === "low" || x === "high" || x === "medium") return x;
  return "medium";
}

function parseIntervalDays(raw: string | null): number {
  const n = Number(raw ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(90, Math.max(1, Math.floor(n)));
}

function effectiveApyThreshold(risk: RiskLevel, base: number): number {
  if (risk === "low") return base * 4.0;
  if (risk === "high") return Math.max(base * 0.35, 0.00005);
  return base;
}

function effectiveCooldownDays(risk: RiskLevel, base: number): number {
  const b = Math.max(1, Math.floor(base));
  if (risk === "low") return Math.max(b, 7);
  if (risk === "high") return Math.max(1, Math.floor(b / 2));
  return b;
}

async function loadManifest(): Promise<PoolEntry[]> {
  const data = await readFile(MANIFEST_PATH, "utf-8");
  const payload = JSON.parse(data) as { data?: PoolEntry[] };
  return payload.data ?? [];
}

function bestPool(manifest: PoolEntry[], predicate: (project: string) => boolean): PoolEntry | null {
  const candidates = manifest.filter(
    (entry) => entry.symbol?.toUpperCase() === "USDC" && predicate((entry.project || "").toLowerCase())
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, current) => {
    const bestTvl = best.tvlUsd ?? 0;
    const currentTvl = current.tvlUsd ?? 0;
    return currentTvl > bestTvl ? current : best;
  });
}

function bestAavePool(manifest: PoolEntry[]): PoolEntry | null {
  return bestPool(manifest, (p) => p.startsWith("aave-v3"));
}

function bestCompoundPool(manifest: PoolEntry[]): PoolEntry | null {
  return bestPool(
    manifest,
    (p) => p.startsWith("compound-v3") || p.startsWith("compound-v2") || p.startsWith("compound")
  );
}

/** Morpho Blue / MetaMorpho style rows on DefiLlama (project morpho, morpho-v1, …). */
function bestMorphoPool(manifest: PoolEntry[]): PoolEntry | null {
  return bestPool(manifest, (p) => p === "morpho" || p.startsWith("morpho-"));
}

function toDecimal(apy?: number | null): number {
  if (apy == null || Number.isNaN(apy)) return 0;
  return apy / 100;
}

async function fetchChart(pool: string): Promise<ChartPoint[]> {
  const res = await fetch(`${CHART_BASE}/${pool}`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const body = (await res.json()) as { data?: ChartPoint[] };
  return body.data ?? [];
}

function bucketDaily(points: ChartPoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of points) {
    if (p.timestamp == null || p.apy == null) continue;
    const day = new Date(p.timestamp).toISOString().slice(0, 10);
    m.set(day, Number(p.apy) / 100);
  }
  return m;
}

function alignApySeries(
  aaveChart: ChartPoint[],
  compoundChart: ChartPoint[],
  morphoChart: ChartPoint[]
): ApyRow[] {
  const A = bucketDaily(aaveChart);
  const B = bucketDaily(compoundChart);
  const M = bucketDaily(morphoChart);
  const days = [...new Set([...A.keys(), ...B.keys(), ...M.keys()])].sort();
  let la = 0;
  let lb = 0;
  let lm = 0;
  let seenA = false;
  let seenB = false;
  let seenM = false;
  const raw: ApyRow[] = [];
  for (const d of days) {
    if (A.has(d)) {
      la = A.get(d)!;
      seenA = true;
    }
    if (B.has(d)) {
      lb = B.get(d)!;
      seenB = true;
    }
    if (M.has(d)) {
      lm = M.get(d)!;
      seenM = true;
    }
    if (seenA && seenB && seenM) {
      raw.push({ day: d, aave: la, compound: lb, morpho: lm });
    }
  }
  if (!raw.length) return [];
  const end = new Date(raw[raw.length - 1]!.day).getTime();
  const start = end - LOOKBACK_DAYS * 86400000;
  return raw.filter((row) => new Date(row.day).getTime() >= start);
}

function bestProtocolFromRow(row: ApyRow): Protocol {
  let best: Protocol = "aave";
  let bestVal = row.aave;
  for (const p of PROTO_ORDER) {
    const v = row[p];
    if (v > bestVal) {
      bestVal = v;
      best = p;
    }
  }
  return best;
}

function decideStep(
  current: Protocol,
  row: ApyRow,
  capital: number,
  dayIndex: number,
  lastSwitchIndex: number,
  apyThreshold: number,
  cooldownDays: number
): { shouldSwitch: boolean; reason: string; candidate: Protocol; projectedGain: number } {
  const best = bestProtocolFromRow(row);
  if (best === current) {
    return { shouldSwitch: false, reason: "Already on highest APY", candidate: current, projectedGain: 0 };
  }
  const curApy = row[current];
  const candApy = row[best];
  const apyDiff = candApy - curApy;
  if (apyDiff <= apyThreshold) {
    return { shouldSwitch: false, reason: "APY difference below threshold", candidate: best, projectedGain: 0 };
  }
  const cooldownOk = dayIndex - lastSwitchIndex >= cooldownDays;
  const projectedGain = apyDiff * capital * (TIME_WINDOW_DAYS / 365);
  if (!cooldownOk) {
    return { shouldSwitch: false, reason: "Cooldown not passed", candidate: best, projectedGain };
  }
  if (projectedGain <= GAS_COST_USD) {
    return { shouldSwitch: false, reason: "Not profitable after gas", candidate: best, projectedGain };
  }
  return { shouldSwitch: true, reason: "Switched: projected gain > gas", candidate: best, projectedGain };
}

function simulateDynamic(
  series: ApyRow[],
  initialCapital: number,
  risk: RiskLevel,
  intervalDays: number
): { history: number[]; switches: number; switchEvents: SwitchEvent[] } {
  const apyThreshold = effectiveApyThreshold(risk, BASE_APY_THRESHOLD);
  const cooldownDays = effectiveCooldownDays(risk, BASE_COOLDOWN_DAYS);
  let capital = initialCapital;
  let current: Protocol = "aave";
  let lastSwitchIndex = -Math.max(cooldownDays, intervalDays);
  const history: number[] = [];
  const switchEvents: SwitchEvent[] = [];
  let switches = 0;

  for (let i = 0; i < series.length; i += 1) {
    const row = series[i]!;
    const intervalOk = i - lastSwitchIndex >= intervalDays;
    if (intervalOk) {
      const { shouldSwitch, reason, candidate } = decideStep(
        current,
        row,
        capital,
        i,
        lastSwitchIndex,
        apyThreshold,
        cooldownDays
      );
      if (shouldSwitch) {
        capital -= GAS_COST_USD;
        current = candidate;
        lastSwitchIndex = i;
        switches += 1;
        switchEvents.push({ day: row.day, index: i, reason });
      }
    }
    const grow = row[current];
    capital *= 1 + grow / 365;
    history.push(Number(capital.toFixed(4)));
  }
  return { history, switches, switchEvents };
}

function simulateStatic(series: ApyRow[], protocol: Protocol, initialCapital: number): number[] {
  let capital = initialCapital;
  const history: number[] = [];
  for (const row of series) {
    capital *= 1 + row[protocol] / 365;
    history.push(Number(capital.toFixed(4)));
  }
  return history;
}

function summarizeStrategy(
  label: string,
  history: number[],
  initialCapital: number,
  switches: number
): ApiStrategy {
  const finalCapital = history[history.length - 1] ?? initialCapital;
  const profitPct = ((finalCapital - initialCapital) / initialCapital) * 100;
  return { label, finalCapital, profitPct, switches, history };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const manifest = await loadManifest();
    const aavePool = bestAavePool(manifest);
    const compoundPool = bestCompoundPool(manifest);
    const morphoPool = bestMorphoPool(manifest);

    if (!aavePool?.pool || !compoundPool?.pool || !morphoPool?.pool) {
      return NextResponse.json(
        {
          error:
            "Could not locate Aave v3, Compound, and Morpho USDC pools in defiyeildpool.json.",
        },
        { status: 400 }
      );
    }

    const [aaveChart, compoundChart, morphoChart] = await Promise.all([
      fetchChart(aavePool.pool),
      fetchChart(compoundPool.pool),
      fetchChart(morphoPool.pool),
    ]);

    const apySeries = alignApySeries(aaveChart, compoundChart, morphoChart);
    if (!apySeries.length) {
      return NextResponse.json(
        { error: "Chart data unavailable for one or more pools. Try again later." },
        { status: 502 }
      );
    }

    const initialCapital = Number(url.searchParams.get("capital") ?? 1000) || 1000;
    const riskLevel = parseRiskLevel(url.searchParams.get("riskLevel"));
    const rebalanceIntervalDays = parseIntervalDays(url.searchParams.get("intervalDays"));

    const last = apySeries[apySeries.length - 1]!;
    const spotAave = last.aave || toDecimal(aavePool.apy);
    const spotCompound = last.compound || toDecimal(compoundPool.apy);
    const spotMorpho = last.morpho || toDecimal(morphoPool.apy);

    const effApy = effectiveApyThreshold(riskLevel, BASE_APY_THRESHOLD);
    const effCd = effectiveCooldownDays(riskLevel, BASE_COOLDOWN_DAYS);

    const { history: dynamicHistory, switches, switchEvents } = simulateDynamic(
      apySeries,
      initialCapital,
      riskLevel,
      rebalanceIntervalDays
    );
    const aaveHist = simulateStatic(apySeries, "aave", initialCapital);
    const compoundHist = simulateStatic(apySeries, "compound", initialCapital);
    const morphoHist = simulateStatic(apySeries, "morpho", initialCapital);

    const dynamicStrategy = summarizeStrategy("dynamic", dynamicHistory, initialCapital, switches);
    const staticAave = summarizeStrategy("static-aave", aaveHist, initialCapital, 0);
    const staticCompound = summarizeStrategy("static-compound", compoundHist, initialCapital, 0);
    const staticMorpho = summarizeStrategy("static-morpho", morphoHist, initialCapital, 0);

    const spotRow: ApyRow = {
      day: last.day,
      aave: spotAave,
      compound: spotCompound,
      morpho: spotMorpho,
    };
    const sample = decideStep(
      "aave",
      spotRow,
      initialCapital,
      0,
      -Math.max(effCd, rebalanceIntervalDays),
      effApy,
      effCd
    );

    const simulationParams: SimulationParams = {
      riskLevel,
      rebalanceIntervalDays,
      effectiveApyThreshold: effApy,
      effectiveCooldownDays: effCd,
      timeWindowDays: TIME_WINDOW_DAYS,
      gasCostUsd: GAS_COST_USD,
    };

    const body: BacktestResponse = {
      apys: { aave: spotAave, compound: spotCompound, morpho: spotMorpho },
      gasCost: GAS_COST_USD,
      strategies: [dynamicStrategy, staticAave, staticCompound, staticMorpho],
      initialCapital,
      apySeries,
      switchEvents,
      projectedGainSample: sample.projectedGain,
      simulationParams,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(
        { error: "Manifest not found. Place defiyeildpool.json at the repo root." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to load backtest manifest." }, { status: 500 });
  }
}
