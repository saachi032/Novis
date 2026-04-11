"use client";

import { useState } from "react";

const levels = [
  {
    id: "conservative" as const,
    label: "Conservative",
    hint: "≥70% Aave, capped deviation",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    hint: "50/50 baseline, up to 70/30 tilt",
  },
  {
    id: "aggressive" as const,
    label: "Aggressive",
    hint: "100% to highest APY protocol",
  },
];

export function RiskAndFees() {
  const [risk, setRisk] = useState<(typeof levels)[number]["id"]>("balanced");
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-black">Risk level</h3>
          <p className="mt-1 max-w-md text-xs text-neutral-600">
            Writes to <code className="text-neutral-700">RiskRegistry</code> per
            PRD. Constraints apply before APY-weighted routing.
          </p>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 cursor-help items-center justify-center rounded-full border border-brand-gray bg-brand-bg text-xs font-semibold text-neutral-600"
          title="Conservative limits exposure to the lower-liquidity venue; Aggressive follows the leader APY."
        >
          ?
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setRisk(l.id)}
            className={`flex-1 rounded-2xl border px-3 py-3 text-left text-xs transition duration-300 hover:scale-[1.02] ${
              risk === l.id
                ? "border-brand-green bg-brand-green/10 text-brand-black"
                : "border-brand-gray/80 bg-white text-neutral-600 hover:border-brand-gray"
            }`}
          >
            <span className="block text-sm font-bold">{l.label}</span>
            <span className="mt-1 block text-[11px] leading-snug text-neutral-500">
              {l.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-brand-gray/60 pt-5">
        <p className="text-xs text-neutral-600">
          <span className="font-semibold text-brand-black">
            Fee transparency:
          </span>{" "}
          0.5% performance fee on yield only (not principal). No deposit or
          withdrawal fees in v1.
        </p>
        <button
          type="button"
          onClick={() => setFaqOpen((o) => !o)}
          className="mt-3 text-xs font-semibold text-brand-green transition duration-300 hover:text-[#3d5a56]"
        >
          {faqOpen ? "Hide" : "Show"} rebalance FAQ
        </button>
        {faqOpen && (
          <ul className="mt-3 list-inside list-disc space-y-2 text-[11px] leading-relaxed text-neutral-600">
            <li>
              Rebalance when |Aave APY − Compound APY| exceeds threshold (e.g.
              3%) and 7-day projected gain exceeds gas.
            </li>
            <li>24-hour cooldown between rebalances to reduce ping-pong.</li>
            <li>
              Chainlink Automation primary path; owner{" "}
              <code className="text-neutral-800">manualRebalance</code> if
              uptime degrades.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
