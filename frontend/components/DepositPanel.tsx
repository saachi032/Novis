"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useDeposit } from "@/lib/hooks/useDepositWithdraw";
import { useStrategyWithRetry } from "@/lib/hooks/useStrategyWithRetry";
import type { RiskLevel, DurationKey } from "@/lib/hooks/useInvestmentStrategy";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";
import {
  getStablecoinOptions,
  type StablecoinId,
} from "@/lib/constants/stablecoins";
import { useStablecoinPreference } from "@/lib/context/StablecoinContext";

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
  const hydrated = useHydrated();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { blendedAPY } = useVaultAPYs();
  const { refetch: refetchPositionBreakdown } = useUserPositionBreakdown(address);
  const {
    depositIntoVault,
    isLoading: depositLoading,
    step,
  } = useDeposit();
  const { setInvestmentStrategy } = useStrategyWithRetry();
  const { refreshHistory } = useTransactionHistory();

  const [depositAmount, setDepositAmount] = useState("");
  const { selectedAsset, setSelectedAsset } = useStablecoinPreference();
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [duration, setDuration] = useState<DurationKey>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allOptions = getStablecoinOptions(chainId);
  const assetOptions = useMemo(() => {
    if (!allOptions) return [];
    return allOptions.filter((o) => o.id === "USDC");
  }, [allOptions]);

  useEffect(() => {
    if (selectedAsset !== "USDC") {
      setSelectedAsset("USDC");
    }
  }, [selectedAsset, setSelectedAsset]);

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
        setError("Maximum deposit is 10,000 (denominated asset) for demo");
        return;
      }

      if (!getStablecoinOptions(chainId)) {
        setError("Switch your wallet to Base Sepolia to use this vault.");
        return;
      }

      // STEP 1: Set the on-chain strategy first so the vault can invest immediately.
      const investmentId = `vault_${Date.now()}`;
      const strategyTxHash = await setInvestmentStrategy(investmentId, risk, duration);

      if (!strategyTxHash) {
        setError("Strategy setup did not complete. Deposit was cancelled so funds stay safe.");
        return;
      }

      // STEP 2: Deposit to vault (USDC only in the current deployment)
      const actualTxHash = await depositIntoVault(depositAmount, "USDC");
      await refetchPositionBreakdown?.();
      await refreshHistory();

      // Deposit succeeded!
      setSuccess(
        `Deposit of ${depositAmount} USDC completed! Transaction ${actualTxHash.slice(0, 10)}... is now reflected from chain state.`
      );
      setDepositAmount("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Deposit failed";
      console.error("Deposit error:", errorMsg);

      if (errorMsg.includes("allowance")) {
        setError(
          "Approval failed. Make sure you have enough of the selected token and try again."
        );
      } else if (errorMsg.includes("gas")) {
        setError(
          "Transaction exceeded gas limit. Try depositing a smaller amount (under $100)."
        );
      } else if (errorMsg.includes("insufficient")) {
        setError(
          `Insufficient ${selectedAsset} balance. Check your wallet on Base Sepolia.`
        );
      } else if (errorMsg.includes("user rejected")) {
        setError("Transaction rejected by user");
      } else if (errorMsg.includes("StrategyNotConfigured")) {
        setError("Strategy router not configured. Please contact support.");
      } else {
        setError(errorMsg);
      }
    }
  };

  const estimatedShares = depositAmount ? parseFloat(depositAmount) : 0;
  const estimatedAPY = blendedAPY ? parseFloat(blendedAPY) : 0;
  const estimatedYield = estimatedShares * (estimatedAPY / 100);
  
  // Show the same layout on both server and client to avoid hydration mismatch
  // Wallet connection checking only happens after hydration on client

  return (
    <div className="surface-card rounded-2xl p-6">
      {/* Wallet Connection Banner */}
      {hydrated && !isConnected && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Connect your wallet on Base Sepolia to deposit
          </p>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">{success}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">✗ {error}</p>
        </div>
      )}
      
      <h3 className="font-display text-lg font-bold text-brand-black">
        Deposit into USDC Vault
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Funds go to VaultManager ({BASE_SEPOLIA_DEPLOYMENT.vaultManager.slice(0, 6)}…
        {BASE_SEPOLIA_DEPLOYMENT.vaultManager.slice(-4)}) on Base Sepolia, then StrategyRouter
        allocates across Aave and Compound. Earn ~{blendedAPY}% blended APY.
      </p>

      <p className="mt-2 text-xs text-neutral-500">
        The live deployment is USDC-only and writes strategy state before the deposit is submitted.
      </p>

      {!allOptions && (
        <p className="mt-4 text-sm text-amber-800">
          Connect to Base Sepolia to use this vault.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {/* Asset */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600">
            Asset
          </label>
          <select
            value={selectedAsset}
            onChange={(e) =>
              setSelectedAsset(e.target.value as StablecoinId)
            }
            disabled={
              !allOptions ||
              assetOptions.length === 0 ||
              depositLoading ||
              (hydrated && !isConnected)
            }
            className="mt-2 w-full rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-semibold text-brand-black focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-neutral-100"
          >
            {assetOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600">
            Deposit amount ({selectedAsset})
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={depositAmount}
              onChange={handleDepositAmountChange}
              placeholder="0.00"
              disabled={depositLoading || (hydrated && !isConnected)}
              className="flex-1 rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-mono text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-neutral-100 disabled:text-neutral-500"
            />
            <button
              onClick={() => setDepositAmount("1000")}
              disabled={depositLoading || (hydrated && !isConnected)}
              className="rounded-lg border border-brand-gray/60 px-3 py-3 text-xs font-semibold text-brand-black hover:bg-brand-bg disabled:bg-neutral-100 disabled:text-neutral-500"
            >
              Max
            </button>
          </div>
          {depositLoading && (
            <p className="mt-2 text-xs text-neutral-500" aria-live="polite">
              {step === "approving" && "Step 1/2: confirm token approval in your wallet…"}
              {step === "depositing" && "Step 2/2: confirming USDC deposit…"}
            </p>
          )}
        </div>

        {/* Risk & Duration Selection */}
        {depositAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4 space-y-4 dark:text-neutral-100">
            <p className="text-xs font-semibold text-brand-black dark:text-neutral-100">
              Configure this investment's risk profile
            </p>

            {/* Risk Level */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2 dark:text-neutral-300">
                Risk Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {riskLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setRisk(level.id)}
                    className={`rounded-lg border px-2.5 py-2 text-xs transition ${
                      risk === level.id
                        ? "border-brand-green bg-brand-green/10 text-brand-black font-semibold"
                        : "border-brand-gray/60 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-200 hover:border-brand-gray"
                    }`}
                  >
                    <div className="font-semibold text-[11px]">{level.label}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{level.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2 dark:text-neutral-300">
                Rebalance Frequency
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {durations.map((dur) => (
                  <button
                    key={dur.id}
                    onClick={() => setDuration(dur.id)}
                    className={`rounded-lg border px-2 py-2 text-[10px] transition font-semibold ${
                      duration === dur.id
                        ? "border-brand-green bg-brand-green/10 text-brand-black"
                        : "border-brand-gray/60 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-200 hover:border-brand-gray"
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-3 dark:text-neutral-100">
              <p className="text-xs text-brand-black dark:text-neutral-100">
                <strong>Investment Strategy:</strong> {risk} risk, {duration} rebalance checks
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleDeposit}
              disabled={
                !allOptions ||
                depositLoading ||
                !depositAmount ||
                Number(depositAmount) <= 0 ||
                (hydrated && !isConnected)
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-green py-3 px-4 font-semibold text-brand-black transition-all hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositLoading && (
                <svg className="h-4 w-4 animate-spin text-brand-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>
                {depositLoading
                  ? step === "approving"
                    ? "Approve in wallet…"
                    : step === "depositing"
                      ? "Depositing…"
                      : step === "zapping"
                        ? "Swap & deposit…"
                        : "Processing…"
                  : "Confirm Deposit & Set Strategy"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
