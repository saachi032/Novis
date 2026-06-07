"use client";

import type { ProtocolSplit } from "@/lib/utils/portfolioAnalytics";
import { formatPct, formatUsd } from "@/lib/utils/portfolioAnalytics";

const PROTOCOL_ROWS = [
  { key: "aave" as const, pctKey: "aavePct" as const, label: "Aave v3", color: "bg-blue-500", text: "text-blue-800 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/30", barTrack: "bg-blue-100 dark:bg-blue-900/50" },
  { key: "compound" as const, pctKey: "compoundPct" as const, label: "Compound v3", color: "bg-emerald-500", text: "text-emerald-800 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", barTrack: "bg-emerald-100 dark:bg-emerald-900/50" },
  { key: "morpho" as const, pctKey: "morphoPct" as const, label: "Morpho Blue", color: "bg-violet-500", text: "text-violet-800 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-900/30", barTrack: "bg-violet-100 dark:bg-violet-900/50" },
];

type ProtocolSplitBarsProps = {
  split: ProtocolSplit;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  hideZero?: boolean;
  /** Per-protocol APY strings, e.g. { aave: "4.80", compound: "6.10", morpho: "5.50" } */
  apys?: { aave?: string; compound?: string; morpho?: string };
};

export function ProtocolSplitBars({
  split,
  title,
  subtitle,
  compact = false,
  hideZero = true,
  apys,
}: ProtocolSplitBarsProps) {
  if (split.total <= 0) {
    return (
      <p className="text-xs text-neutral-500">
        No protocol allocation recorded yet. Funds may still be idle in the vault.
      </p>
    );
  }

  const rows = PROTOCOL_ROWS.filter((row) => !hideZero || split[row.key] > 0);

  const getApy = (key: "aave" | "compound" | "morpho") => {
    if (!apys) return null;
    const val = apys[key];
    if (!val || val === "0") return null;
    return val;
  };

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && (
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
          )}
          {subtitle && <p className="mt-0.5 text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
      )}

      {compact ? (
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          {rows.map((row) => {
            const apy = getApy(row.key);
            return (
              <div key={row.key} className={`rounded-lg px-2 py-2 ${row.bg}`}>
                <p className={`font-semibold ${row.text}`}>{row.label.replace(" v3", "").replace(" Blue", "")}</p>
                <p className={`${row.text} opacity-90`}>${formatUsd(split[row.key])}</p>
                <p className="text-[10px] text-neutral-600 dark:text-neutral-400">{formatPct(split[row.pctKey])}%</p>
                {apy && (
                  <p className="mt-0.5 text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
                    APY {apy}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        rows.map((row) => {
          const apy = getApy(row.key);
          return (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-black flex items-center gap-2">
                  {row.label}
                  {apy && (
                    <span className="rounded bg-brand-bg px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                      {apy}% APY
                    </span>
                  )}
                </span>
                <span className="text-neutral-600 dark:text-neutral-400">
                  ${formatUsd(split[row.key])} ({formatPct(split[row.pctKey])}%)
                </span>
              </div>
              <div className={`h-2 w-full rounded-full ${row.barTrack}`}>
                <div
                  className={`${row.color} h-2 rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${split[row.pctKey]}%` }}
                />
              </div>
            </div>
          );
        })
      )}

      {/* Total row */}
      {!compact && (
        <div className="flex items-center justify-between border-t border-brand-gray/40 pt-2 text-xs dark:border-neutral-600">
          <span className="font-semibold text-neutral-600 dark:text-neutral-400">Total in protocols</span>
          <span className="font-bold text-brand-black">${formatUsd(split.total)}</span>
        </div>
      )}
    </div>
  );
}
