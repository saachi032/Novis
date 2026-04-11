"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  readDepositPrefs,
  writeDepositPrefs,
  type RiskLevelId,
  type SwapCadenceId,
} from "@/lib/depositPreferences";

const RISK_OPTIONS: {
  id: RiskLevelId;
  label: string;
  prdName: string;
  hint: string;
}[] = [
  {
    id: "conservative",
    label: "Low",
    prdName: "Conservative",
    hint: "≥70% Aave; max 30% in lower-liquidity venue (RiskRegistry).",
  },
  {
    id: "balanced",
    label: "Medium",
    prdName: "Balanced",
    hint: "50/50 baseline; APY-driven tilt up to 70/30.",
  },
  {
    id: "aggressive",
    label: "High",
    prdName: "Aggressive",
    hint: "Up to 100% to highest APY protocol.",
  },
];

const SWAP_CADENCE_OPTIONS: {
  id: SwapCadenceId;
  label: string;
  hint: string;
}[] = [
  {
    id: "24h",
    label: "24 hours",
    hint: "Matches PRD default rebalance cooldown (86400s).",
  },
  {
    id: "48h",
    label: "48 hours",
    hint: "Fewer rotations; lower relative gas from moves.",
  },
  {
    id: "72h",
    label: "72 hours",
    hint: "Patient cadence between eligible rebalances.",
  },
];

export type DepositWithdrawVariant = "full" | "deposit-only" | "withdraw-only";

export function DepositWithdrawPanel({
  defaultTab = "deposit",
  variant = "full",
}: {
  defaultTab?: "deposit" | "withdraw";
  variant?: DepositWithdrawVariant;
}) {
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<"deposit" | "withdraw">(defaultTab);

  const showTabs = variant === "full";
  const effectiveTab: "deposit" | "withdraw" =
    variant === "deposit-only"
      ? "deposit"
      : variant === "withdraw-only"
        ? "withdraw"
        : tab;

  useEffect(() => {
    if (variant === "deposit-only") setTab("deposit");
    if (variant === "withdraw-only") setTab("withdraw");
  }, [variant]);
  const [amount, setAmount] = useState("");
  const [risk, setRisk] = useState<RiskLevelId>("balanced");
  const [swapCadence, setSwapCadence] = useState<SwapCadenceId>("24h");

  const persistPrefs = useCallback(
    (next: { risk: RiskLevelId; swapCadence: SwapCadenceId }) => {
      if (!address) return;
      writeDepositPrefs(address, next);
    },
    [address]
  );

  useEffect(() => {
    if (!address) return;
    const stored = readDepositPrefs(address);
    if (stored) {
      setRisk(stored.risk);
      setSwapCadence(stored.swapCadence);
    }
  }, [address]);

  const handleRiskChange = (id: RiskLevelId) => {
    setRisk(id);
    if (address) persistPrefs({ risk: id, swapCadence });
  };

  const handleCadenceChange = (id: SwapCadenceId) => {
    setSwapCadence(id);
    if (address) persistPrefs({ risk, swapCadence: id });
  };

  const riskMeta = RISK_OPTIONS.find((o) => o.id === risk)!;
  const cadenceMeta = SWAP_CADENCE_OPTIONS.find((o) => o.id === swapCadence)!;

  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      {showTabs ? (
        <div className="flex rounded-2xl border border-brand-gray/80 bg-brand-bg p-1">
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition duration-300 ${
                tab === t
                  ? "bg-white text-brand-black shadow-soft"
                  : "text-neutral-500 hover:text-brand-black"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      {effectiveTab === "deposit" ? (
        <div
          className={`space-y-6 ${showTabs ? "mt-6 border-t border-brand-gray/50 pt-6" : "mt-0 border-0 pt-0"}`}
        >
          <div>
            <h3 className="text-sm font-semibold text-brand-black">
              Risk level
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
              Maps to <code className="text-neutral-600">RiskRegistry</code>{" "}
              (Conservative / Balanced / Aggressive). Shown as low / medium /
              high.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {RISK_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleRiskChange(o.id)}
                  className={`rounded-2xl border px-2 py-3 text-center transition duration-300 ${
                    risk === o.id
                      ? "border-brand-green bg-brand-green/10"
                      : "border-brand-gray/80 bg-white hover:border-brand-gray"
                  }`}
                >
                  <span className="block text-sm font-bold text-brand-black">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium text-neutral-500">
                    {o.prdName}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-neutral-500">
              {riskMeta.hint}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand-black">
              Rebalance timing
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
              Minimum time between automated rebalances (cooldown concept in{" "}
              <code className="text-neutral-600">RebalanceExecutor</code>).
              Your preference for deposit; on-chain defaults may apply until
              wired.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {SWAP_CADENCE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleCadenceChange(o.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition duration-300 ${
                    swapCadence === o.id
                      ? "border-brand-green bg-brand-green/10"
                      : "border-brand-gray/80 bg-white hover:border-brand-gray"
                  }`}
                >
                  <span className="text-sm font-semibold text-brand-black">
                    {o.label}
                  </span>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      swapCadence === o.id
                        ? "border-brand-green bg-brand-green"
                        : "border-brand-gray"
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              {cadenceMeta.hint}
            </p>
          </div>
        </div>
      ) : null}

      <div className={showTabs ? "mt-5" : "mt-6"}>
        <label className="text-xs font-medium text-neutral-600">
          Amount (USDC)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-brand-gray bg-white px-4 py-3 text-sm text-brand-black outline-none ring-brand-green/30 placeholder:text-neutral-400 focus:ring-2"
          />
          <button
            type="button"
            className="shrink-0 rounded-2xl border border-brand-gray bg-white px-4 text-xs font-bold uppercase tracking-wide text-brand-black transition duration-300 hover:scale-105 hover:bg-brand-bg"
          >
            Max
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          className="mt-4 w-full accent-[#557571]"
          aria-label="Amount percentage"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-brand-gray/60 bg-brand-bg p-4 text-xs text-neutral-600">
        {effectiveTab === "deposit" ? (
          <>
            <p>
              <span className="text-neutral-500">Risk: </span>
              <span className="font-semibold text-brand-black">
                {riskMeta.label} ({riskMeta.prdName})
              </span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Rebalance timing: </span>
              <span className="font-semibold text-brand-black">
                {cadenceMeta.label}
              </span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Est. shares: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Share price: </span>
              <span className="font-semibold text-brand-black">$1.024</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Projected yield (30d): </span>
              <span className="font-semibold text-brand-green">~0.48%</span>
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="text-neutral-500">Shares burned: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">USDC received: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-brand-gray bg-white px-3 py-2 text-[11px] text-neutral-600">
        Allowance required? Approve USDC once, then confirm{" "}
        {effectiveTab === "deposit" ? "deposit" : "withdraw"} in your wallet.
      </div>

      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            type="button"
            className="mt-5 w-full rounded-full bg-brand-green py-3.5 text-sm font-semibold text-white transition duration-300 hover:scale-105 hover:bg-[#3d5a56] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            disabled={isConnected && !amount.trim()}
            onClick={() => {
              if (!isConnected) openConnectModal();
              else if (amount.trim()) {
                if (effectiveTab === "deposit") {
                  const riskLine = `${riskMeta.label} / ${riskMeta.prdName}`;
                  const cadenceLine = cadenceMeta.label;
                  window.alert(
                    `VaultManager integration pending — set NEXT_PUBLIC_VAULT_ADDRESS and wire the ABI.\n\nSelected for this deposit:\n• Risk: ${riskLine}\n• Rebalance timing: ${cadenceLine}\n\nWire RiskRegistry.setRiskLevel() and executor cooldown params when deployed.`
                  );
                } else {
                  window.alert(
                    "VaultManager.withdraw() integration pending — set NEXT_PUBLIC_VAULT_ADDRESS and wire the ABI."
                  );
                }
              }
            }}
          >
            {!isConnected
              ? `Connect wallet to ${effectiveTab}`
              : `Confirm ${effectiveTab}`}
          </button>
        )}
      </ConnectButton.Custom>
      <p className="mt-2 text-center text-[10px] text-neutral-500">
        Gas on Base is typically low; exact fee shown in your wallet.
      </p>
    </div>
  );
}
