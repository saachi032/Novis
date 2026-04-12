"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useUserVaultShares, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useDeposit } from "@/lib/hooks/useDepositWithdraw";
import { useStrategyWithRetry } from "@/lib/hooks/useStrategyWithRetry";
import type { RiskLevel, DurationKey } from "@/lib/hooks/useInvestmentStrategy";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
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
  const { shares } = useUserVaultShares(address);
  const { blendedAPY } = useVaultAPYs();
  const {
    depositIntoVault,
    isLoading: depositLoading,
    hash,
    step,
    zapperStatus,
  } = useDeposit();
  const { setInvestmentStrategy } = useStrategyWithRetry();
  const { addTransaction, updateLatestTransactionHashAndStatus } = useTransactionHistory();

  const [depositAmount, setDepositAmount] = useState("");
  const { selectedAsset, setSelectedAsset } = useStablecoinPreference();
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [duration, setDuration] = useState<DurationKey>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentInvestmentId, setCurrentInvestmentId] = useState<string | null>(null);
  const [depositHash, setDepositHash] = useState<string | null>(null);

  const allOptions = getStablecoinOptions(chainId);
  const assetOptions = useMemo(() => {
    if (!allOptions) return [];
    if (zapperStatus === "on") return allOptions;
    return allOptions.filter((o) => o.id === "USDC");
  }, [allOptions, zapperStatus]);

  useEffect(() => {
    if (zapperStatus !== "on" && selectedAsset !== "USDC") {
      setSelectedAsset("USDC");
    }
  }, [zapperStatus, selectedAsset]);

  // Track transaction status changes when hash arrives
  useEffect(() => {
    if (currentInvestmentId && depositHash) {
      console.log(`Updating transaction with real hash: ${depositHash}`);
      updateLatestTransactionHashAndStatus(currentInvestmentId, depositHash, "active");
      setCurrentInvestmentId(null);
      setDepositHash(null);
    }
  }, [depositHash, currentInvestmentId, updateLatestTransactionHashAndStatus]);

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
        setError("Switch your wallet to Base Sepolia or Base mainnet.");
        return;
      }

      // STEP 1: Deposit to vault (USDC or zapper)
      console.log("Starting deposit...");
      const actualTxHash = await depositIntoVault(depositAmount, selectedAsset);
      
      // Record the transaction in history with the actual hash
      const invId = addTransaction(depositAmount, risk, duration, actualTxHash, "deposit");
      setCurrentInvestmentId(invId);
      setDepositHash(actualTxHash);

      // Deposit succeeded!
      setSuccess(
        `Deposit of ${depositAmount} ${selectedAsset} completed! Funds in vault.`
      );
      setDepositAmount("");

      // STEP 2: Set investment strategy (OPTIONAL - happens in background)
      // This is separate and won't block the user's deposit success
      console.log("Setting strategy in background...");
      const investmentId = `vault_${Date.now()}`;
      
      // Fire and forget - don't await, don't block UI
      setInvestmentStrategy(investmentId, risk, duration)
        .then(() => {
          console.log("Strategy set successfully");
          setSuccess(
            `Deposit complete! Risk: ${risk} • Checks: ${duration}`
          );
        })
        .catch((err) => {
          // Strategy failed, but deposit succeeded - that's OK
          console.warn("Strategy setting encountered an issue:", err);
          // Don't show error to user - deposit is safe
        });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Deposit failed";
      console.error("Deposit error:", errorMsg);

      // Record failed transaction with error marker
      const invId = addTransaction(depositAmount, risk, duration, "failed", "deposit");
      updateLatestTransactionHashAndStatus(invId, "failed", "failed");

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
        Deposit stablecoins
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Earn {blendedAPY}% APY through Aave & Compound
      </p>

      {zapperStatus === "off" && (
        <p className="mt-2 text-xs text-neutral-500">
          USDT and DAI require the on-chain zapper (swap router). This deployment
          accepts USDC only.
        </p>
      )}

      {!allOptions && (
        <p className="mt-4 text-sm text-amber-800">
          Connect to Base Sepolia or Base mainnet to use this vault.
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
              zapperStatus === "loading" ||
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
              {step === "zapping" && "Step 2/2: swap to USDC and deposit (one transaction)…"}
            </p>
          )}
        </div>

        {/* Risk & Duration Selection */}
        {depositAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4 space-y-4">
            <p className="text-xs font-semibold text-brand-black">
              Configure this investment's risk profile
            </p>

            {/* Risk Level */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
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
                        : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"
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
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
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
                        : "border-brand-gray/60 bg-white text-neutral-600 hover:border-brand-gray"
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-3">
              <p className="text-xs text-brand-black">
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
              className="w-full rounded-lg bg-brand-green py-3 px-4 font-semibold text-brand-black transition-all hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositLoading
                ? step === "approving"
                  ? "Approve in wallet…"
                  : step === "depositing"
                    ? "Depositing…"
                    : step === "zapping"
                      ? "Swap & deposit…"
                      : "Processing…"
                : "Confirm Deposit & Set Strategy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
