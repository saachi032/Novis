"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserVaultShares, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useDeposit } from "@/lib/hooks/useDepositWithdraw";
import { useSetInvestmentStrategy, type RiskLevel, type DurationKey } from "@/lib/hooks/useInvestmentStrategy";

const riskLevels = [
  { id: "conservative" as const, label: "Conservative", hint: "40% allocation" },
  { id: "balanced" as const, label: "Balanced", hint: "60% allocation (recommended)" },
  { id: "aggressive" as const, label: "Aggressive", hint: "80% allocation" },
];

const durations = [
  { id: "daily" as const, label: "Daily" },
  { id: "weekly" as const, label: "Weekly" },
  { id: "monthly" as const, label: "Monthly" },
  { id: "quarterly" as const, label: "Quarterly" },
  { id: "halfYearly" as const, label: "Half-Yearly" },
];

export function DepositPanel() {
  const { address, isConnected } = useAccount();
  const { shares } = useUserVaultShares(address);
  const { blendedAPY } = useVaultAPYs();
  const { depositIntoVault, isLoading: depositLoading, hash, step } = useDeposit();
  const { setInvestmentStrategy } = useSetInvestmentStrategy();

  const [depositAmount, setDepositAmount] = useState("");
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [duration, setDuration] = useState<DurationKey>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDepositAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setDepositAmount(value);
      setError(null);
    }
  };

  const handleDeposit = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      if (parseFloat(depositAmount) > 10000) {
        setError("Maximum deposit is 10,000 USDC for demo");
        return;
      }

      await depositIntoVault(depositAmount);
      const investmentId = `vault_$\{Date.now()}`;
      try {
        await setInvestmentStrategy(investmentId, risk, duration);
      } catch (strategyErr) {
        console.warn("Strategy registration failed, but deposit succeeded:", strategyErr);
      }

      setSuccess(
        `Deposit of $\{depositAmount} USDC created with $\{risk} risk, $\{duration} checks!`
      );
      setDepositAmount("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Deposit failed";
      if (errorMsg.includes("gas")) {
        setError("Transaction exceeded gas limit. Try a smaller amount or check contract.");
      } else if (errorMsg.includes("insufficient")) {
        setError("Insufficient balance to complete deposit");
      } else if (errorMsg.includes("user rejected")) {
        setError("Transaction rejected by user");
      } else {
        setError(errorMsg);
      }
    }
  };

  const estimatedShares = depositAmount ? parseFloat(depositAmount) : 0;
  const estimatedAPY = blendedAPY ? parseFloat(blendedAPY) : 0;
  const estimatedYield = estimatedShares * (estimatedAPY / 100);

  if (!isConnected) {
    return (
      <div className="surface-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-bold text-brand-black">Deposit USDC</h3>
        <p className="mt-2 text-sm text-neutral-600">
          Connect your wallet on Base Sepolia to deposit.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl p-6">
      <h3 className="font-display text-lg font-bold text-brand-black">Deposit USDC</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Earn {blendedAPY}% APY through Aave & Compound
      </p>

      <div className="mt-6 space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600">
            Deposit Amount (USDC)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={depositAmount}
              onChange={handleDepositAmountChange}
              placeholder="0.00"
              disabled={depositLoading}
              className="flex-1 rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-mono text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-neutral-100 disabled:text-neutral-500"
            />
            <button onClick={() => setDepositAmount("1000")} disabled={depositLoading} className="rounded-lg border border-brand-gray/60 px-3 py-3 text-xs font-semibold text-brand-black hover:bg-brand-bg disabled:bg-neutral-100 disabled:text-neutral-500">Max</button>
          </div>
        </div>

        {depositAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4 space-y-4">
            <p className="text-xs font-semibold text-brand-black">Configure this investment'"'"'s risk profile</p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">Risk Level</label>
              <div className="grid grid-cols-3 gap-2">
                {riskLevels.map((level) => (
                  <button key={level.id} onClick={() => setRisk(level.id)} className={`rounded-lg border px-2.5 py-2 text-xs transition $\{risk === level.id ? "border-brand-green bg-brand-green/10 text-brand-black font-semibold" : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"}`}>
                    <div className="font-semibold text-[11px]">{level.label}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{level.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">Rebalance Frequency</label>
              <div className="grid grid-cols-5 gap-1.5">
                {durations.map((dur) => (
                  <button key={dur.id} onClick={() => setDuration(dur.id)} className={`rounded-lg border px-2 py-2 text-[10px] transition font-semibold $\{duration === dur.id ? "border-brand-green bg-brand-green/10 text-brand-black" : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"}`}>{dur.label}</button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-3">
              <p className="text-xs text-brand-black"><strong>Investment Strategy:</strong> {risk} risk, {duration} rebalance checks</p>
            </div>
          </div>
        )}

        {depositAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-neutral-600">Estimated Vault Shares:</span>
              <span className="font-semibold text-brand-black">{estimatedShares.toFixed(2)} shares</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-neutral-600">1-Year Yield Estimate:</span>
              <span className="font-semibold text-brand-green">+$\{estimatedYield.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">APY:</span>
              <span className="font-semibold text-brand-black">{blendedAPY}%</span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-brand-gray/40 p-3">
          <p className="text-xs text-neutral-500">Your current vault shares:</p>
          <p className="mt-1 font-display text-sm font-bold text-brand-black">{shares && shares !== "0" ? `$\{Number(shares).toLocaleString(undefined, { maximumFractionDigits: 4 })}` : "No shares"}</p>
        </div>

        {depositLoading && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700 capitalize">{step === "approving" ? "⏳ Approving USDC..." : "⏳ Depositing into vault..."}</p>
            <p className="text-[10px] text-blue-600 mt-1">{step === "approving" && "Waiting for approval transaction..."}{step === "depositing" && "Please confirm the deposit transaction in your wallet..."}</p>
          </div>
        )}

        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">✗ {error}</div>}
        {success && <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">✓ {success}</div>}

        <button onClick={handleDeposit} disabled={depositLoading || !depositAmount || parseFloat(depositAmount) <= 0} className="w-full rounded-lg bg-brand-green py-3 font-semibold text-white transition hover:bg-brand-green/90 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed">
          {depositLoading ? (step === "approving" ? "Approving..." : "Depositing...") : `Deposit USDC & Set Strategy`}
        </button>

        {hash && <p className="text-xs text-neutral-600 text-center">Transaction hash: {hash.slice(0, 10)}...</p>}
      </div>
    </div>
  );
}
