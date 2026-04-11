import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = path.resolve(process.cwd(), "../defiyeildpool.json");
const GAS_COST_USD = 5;
const TIME_WINDOW_DAYS = 7;
const SIMULATION_DAYS = 30;

type PoolEntry = {
  project?: string;
  symbol?: string;
  pool?: string;
  apy?: number | null;
  tvlUsd?: number | null;
};

type ApiStrategy = {
  label: string;
  finalCapital: number;
  profitPct: number;
  switches: number;
  history: number[];
};

async function loadManifest(): Promise<PoolEntry[]> {
  const data = await readFile(MANIFEST_PATH, "utf-8");
  const payload = JSON.parse(data) as { data?: PoolEntry[] };
  return payload.data ?? [];
}

function bestPoolForProto(manifest: PoolEntry[], prefix: string): PoolEntry | null {
  const candidates = manifest.filter(
    (entry) =>
      entry.symbol?.toUpperCase() === "USDC" && entry.project?.toLowerCase().startsWith(prefix)
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, current) => {
    const bestTvl = best.tvlUsd ?? 0;
    const currentTvl = current.tvlUsd ?? 0;
    return currentTvl > bestTvl ? current : best;
  });
}

function toDecimal(apy?: number | null): number {
  if (!apy || Number.isNaN(apy)) return 0;
  return apy / 100;
}

function buildHistory(initialCapital: number, apy: number, days: number): number[] {
  const history: number[] = [];
  let capital = initialCapital;
  for (let i = 0; i < days; i += 1) {
    capital *= 1 + apy / 365;
    history.push(Number(capital.toFixed(4)));
  }
  return history;
}

function summarizeHistory(initialCapital: number, history: number[]): ApiStrategy {
  const finalCapital = history[history.length - 1] ?? initialCapital;
  const profitPct = ((finalCapital - initialCapital) / initialCapital) * 100;
  return {
    label: "static",
    finalCapital,
    profitPct,
    switches: 0,
    history,
  };
}

export async function GET(request: Request) {
  try {
    const manifest = await loadManifest();
    const aave = bestPoolForProto(manifest, "aave-v3");
    const morpho = bestPoolForProto(manifest, "morpho-v1");

    if (!aave || !morpho) {
      return NextResponse.json(
        { error: "Could not locate both Aave v3 and Morpho v1 USDC pools." },
        { status: 400 }
      );
    }

  const apos = {
    aave: toDecimal(aave.apy),
    morpho: toDecimal(morpho.apy),
  };
  const dynamicStartApy = apos.aave;
  const dynamicTargetApy = apos.morpho;

  const initialCapital = Number(new URL(request.url).searchParams.get("capital") ?? 1000) || 1000;

  const aaveHistory = buildHistory(initialCapital, apos.aave, SIMULATION_DAYS);
  const morphoHistory = buildHistory(initialCapital, apos.morpho, SIMULATION_DAYS);

  const projectedGain =
    Math.max(0, dynamicTargetApy - dynamicStartApy) * initialCapital * (TIME_WINDOW_DAYS / 365);
  const shouldSwitch = projectedGain > GAS_COST_USD;

  const dynamicHistory: number[] = [];
  let dynamicCapital = initialCapital;
  const firstSegmentDays = shouldSwitch ? Math.floor(SIMULATION_DAYS * 0.4) : SIMULATION_DAYS;

  for (let i = 0; i < firstSegmentDays; i += 1) {
    dynamicCapital *= 1 + dynamicStartApy / 365;
    dynamicHistory.push(Number(dynamicCapital.toFixed(4)));
  }

  if (shouldSwitch) {
    dynamicCapital -= GAS_COST_USD;
    for (let i = firstSegmentDays; i < SIMULATION_DAYS; i += 1) {
      dynamicCapital *= 1 + dynamicTargetApy / 365;
      dynamicHistory.push(Number(dynamicCapital.toFixed(4)));
    }
  }

  if (!shouldSwitch && dynamicHistory.length < SIMULATION_DAYS) {
    for (let i = dynamicHistory.length; i < SIMULATION_DAYS; i += 1) {
      dynamicCapital *= 1 + dynamicStartApy / 365;
      dynamicHistory.push(Number(dynamicCapital.toFixed(4)));
    }
  }

  const dynamicStrategy: ApiStrategy = {
    label: "dynamic",
    finalCapital: dynamicHistory[dynamicHistory.length - 1] ?? dynamicCapital,
    profitPct: ((dynamicHistory[dynamicHistory.length - 1] ?? dynamicCapital) - initialCapital) / initialCapital * 100,
    switches: shouldSwitch ? 1 : 0,
    history: dynamicHistory,
  };

  const staticAave = summarizeHistory(initialCapital, aaveHistory);
  staticAave.label = "static-aave";
  const staticMorpho = summarizeHistory(initialCapital, morphoHistory);
  staticMorpho.label = "static-morpho";

    return NextResponse.json({
      apys: { aave: apos.aave, morpho: apos.morpho },
      gasCost: GAS_COST_USD,
      strategies: [dynamicStrategy, staticAave, staticMorpho],
      initialCapital,
      projectedGain,
      switched: shouldSwitch,
    });
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
