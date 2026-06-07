"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserVaultShares, useUserPositionValue, useVaultAPYs } from "@/lib/hooks/useVaultData";
import { useWithdraw } from "@/lib/hooks/useDepositWithdraw";
import { useHydrated } from "@/lib/hooks/useHydrated";

export function WithdrawPanel() {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  const { shares } = useUserVaultShares(address);
  const { positionValue } = useUserPositionValue(address);
  const { blendedAPY } = useVaultAPYs();
  const { withdraw, isLoading, hash } = useWithdraw();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const shareBigInt = shares && shares !== "0" ? parseFloat(shares) : 0;
  const positionUsd = positionValue && positionValue !== "0" ? parseFloat(positionValue) : 0;

  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
      setError(null);
    }
  };

  const handleWithdraw = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      if (parseFloat(withdrawAmount) > positionUsd) {
        setError(`You only have about $${positionUsd.toFixed(2)} available to withdraw`);
        return;
      }

      await withdraw(withdrawAmount);
      setSuccess("Withdrawal submitted. You will receive USDC from the vault.");
      setWithdrawAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    }
  };

  const showNoSharesMessage = hydrated && shareBigInt === 0;
  const showDisconnectMessage = hydrated && !isConnected;

  return (
    <div className="surface-card rounded-2xl p-6">
      {showDisconnectMessage && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Connect your wallet on Base Sepolia to withdraw
          </p>
        </div>
      )}

      {showNoSharesMessage && (
        <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            You don&apos;t have any vault shares yet. Deposit USDC to earn yield.
          </p>
        </div>
      )}

      <h3 className="font-display text-lg font-bold text-brand-black">Withdraw</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Withdraw <strong className="text-brand-black">USDC</strong> directly from the vault.
        Blended APY reference: {blendedAPY}%.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-600">
            USDC to withdraw
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={withdrawAmount}
              onChange={handleWithdrawAmountChange}
              placeholder="0.00"
              disabled={showDisconnectMessage || showNoSharesMessage}
              className="flex-1 rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-mono text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-neutral-100 disabled:text-neutral-500"
            />
              <button
              type="button"
              onClick={() => setWithdrawAmount(positionUsd.toString())}
              disabled={showDisconnectMessage || showNoSharesMessage}
              className="rounded-lg border border-brand-gray/60 px-3 py-3 text-xs font-semibold text-brand-black hover:bg-brand-bg disabled:bg-neutral-100 disabled:text-neutral-500"
            >
              Max
            </button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            The vault settles in USDC. Convert elsewhere if you want another stablecoin.
          </p>
        </div>

        <div className="rounded-lg border border-brand-gray/40 p-3">
          <p className="text-xs text-neutral-500">Your vault shares</p>
          <p className="mt-1 font-display text-sm font-bold text-brand-black">
            {shareBigInt.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </p>
        </div>

        {withdrawAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Requested USDC out:</span>
              <span className="font-semibold text-brand-black">
                ${parseFloat(withdrawAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">{success}</div>
        )}

        <button
          type="button"
          onClick={handleWithdraw}
          disabled={
            isLoading ||
            !withdrawAmount ||
            parseFloat(withdrawAmount) <= 0 ||
            showDisconnectMessage ||
            showNoSharesMessage
          }
          className="w-full rounded-lg bg-red-500 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
        >
          {isLoading ? "Processing…" : "Withdraw USDC"}
        </button>

        {hash && (
          <p className="text-center text-xs text-neutral-600">
            Transaction hash: {hash.slice(0, 10)}…
          </p>
        )}
      </div>
    </div>
  );
}
