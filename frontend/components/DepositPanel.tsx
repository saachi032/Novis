"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserVaultShares, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useDeposit } from "@/lib/hooks/useDepositWithdraw";

export function DepositPanel() {
  const { address, isConnected } = useAccount();
  const { shares } = useUserVaultShares(address);
  const { blendedAPY } = useVaultAPYs();
  const { depositIntoVault, isLoading, hash } = useDeposit();

  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDepositAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
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

      // Trigger the deposit
      await depositIntoVault(depositAmount);
      setSuccess(`Deposit of ${depositAmount} USDC initiated!`);
      setDepositAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    }
  };

  const estimatedShares = depositAmount
    ? parseFloat(depositAmount)
    : 0;
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
              className="flex-1 rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-mono text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <button
              onClick={() => setDepositAmount("1000")}
              className="rounded-lg border border-brand-gray/60 px-3 py-3 text-xs font-semibold text-brand-black hover:bg-brand-bg"
            >
              Max
            </button>
          </div>
        </div>

        {/* Estimated Values */}
        {depositAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-neutral-600">Estimated Vault Shares:</span>
              <span className="font-semibold text-brand-black">
                {estimatedShares.toFixed(2)} shares
              </span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-neutral-600">1-Year Yield Estimate:</span>
              <span className="font-semibold text-brand-green">
                +${estimatedYield.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">APY:</span>
              <span className="font-semibold text-brand-black">{blendedAPY}%</span>
            </div>
          </div>
        )}

        {/* Your Current Shares */}
        <div className="rounded-lg border border-brand-gray/40 p-3">
          <p className="text-xs text-neutral-500">Your current vault shares:</p>
          <p className="mt-1 font-display text-sm font-bold text-brand-black">
            {shares && shares !== "0" 
              ? `${Number(shares).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : "No shares"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">
            ✓ {success}
          </div>
        )}

        {/* Deposit Button */}
        <button
          onClick={handleDeposit}
          disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0}
          className="w-full rounded-lg bg-brand-green py-3 font-semibold text-white transition hover:bg-brand-green/90 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Deposit USDC"}
        </button>

        {hash && (
          <p className="text-xs text-neutral-600 text-center">
            Transaction hash: {hash.slice(0, 10)}...
          </p>
        )}
      </div>
    </div>
  );
}
