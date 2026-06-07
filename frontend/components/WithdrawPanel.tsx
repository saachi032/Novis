"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  useUserVaultShares,
  useUserPositionValue,
  useVaultAPYs,
  useMaxWithdraw,
} from "@/lib/hooks/useVaultData";
import { useWithdraw } from "@/lib/hooks/useDepositWithdraw";
import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useTransactionHistory } from "@/lib/hooks/useTransactionHistory";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";

const CHAIN_ID = 84532;
const EXPLORER = "https://sepolia.basescan.org";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WithdrawPanel() {
  const hydrated = useHydrated();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { shares, refetch: refetchShares } = useUserVaultShares(address);
  const { positionValue, refetch: refetchPosition } = useUserPositionValue(address);
  const { maxWithdraw, refetch: refetchMaxWithdraw } = useMaxWithdraw(address);
  const { refetch: refetchBreakdown } = useUserPositionBreakdown(address);
  const { blendedAPY } = useVaultAPYs();
  const { withdraw, isLoading, hash, method } = useWithdraw();
  const { refreshHistory } = useTransactionHistory();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const shareBigInt = shares && shares !== "0" ? parseFloat(shares) : 0;
  const positionUsd = positionValue && positionValue !== "0" ? parseFloat(positionValue) : 0;
  const maxUsd = maxWithdraw && maxWithdraw !== "0" ? parseFloat(maxWithdraw) : positionUsd;
  const withdrawLimit = Math.min(positionUsd, maxUsd);
  const wrongNetwork = hydrated && chainId !== CHAIN_ID;

  const handleWithdrawAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
      setError(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      refetchShares?.(),
      refetchPosition?.(),
      refetchMaxWithdraw?.(),
      refetchBreakdown?.(),
      refreshHistory(),
    ]);
  };

  const handleWithdraw = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (wrongNetwork) {
        setError("Switch your wallet to Base Sepolia to withdraw.");
        return;
      }

      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      if (parseFloat(withdrawAmount) > withdrawLimit + 0.000001) {
        setError(
          `Maximum withdrawable right now is ${withdrawLimit.toFixed(2)} USDC`
        );
        return;
      }

      await withdraw(withdrawAmount);
      setSuccess("Withdrawal confirmed! USDC has been sent to your wallet.");
      setWithdrawAmount("");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    }
  };

  const showNoSharesMessage = hydrated && isConnected && !wrongNetwork && shareBigInt === 0;
  const showDisconnectMessage = hydrated && !isConnected;

  return (
    <div className="surface-card rounded-2xl p-6">
      {showDisconnectMessage && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Connect your wallet on Base Sepolia to withdraw
          </p>
        </div>
      )}

      {wrongNetwork && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Switch your wallet to Base Sepolia (chain ID {CHAIN_ID}) to withdraw from this vault.
          </p>
        </div>
      )}

      {showNoSharesMessage && (
        <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-600 dark:bg-blue-900/30">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            You don&apos;t have any vault shares yet. Deposit USDC to earn yield.
          </p>
        </div>
      )}

      <h3 className="font-display text-lg font-bold text-brand-black">Withdraw from USDC Vault</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Withdraw <strong className="text-brand-black">USDC</strong> from{" "}
        <a
          href={`${EXPLORER}/address/${BASE_SEPOLIA_DEPLOYMENT.vaultManager}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline decoration-dotted hover:text-brand-green"
        >
          {shortAddress(BASE_SEPOLIA_DEPLOYMENT.vaultManager)}
        </a>
        . The router pulls liquidity from Aave, Compound &amp; Morpho automatically.
        Blended APY: {blendedAPY}%.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-600">USDC to withdraw</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={withdrawAmount}
              onChange={handleWithdrawAmountChange}
              placeholder="0.00"
              disabled={showDisconnectMessage || showNoSharesMessage || wrongNetwork}
              className="flex-1 rounded-lg border border-brand-gray/60 bg-white px-4 py-3 text-sm font-mono text-brand-black placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:bg-neutral-100 disabled:text-neutral-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={() => setWithdrawAmount(withdrawLimit.toFixed(6).replace(/\.?0+$/, "") || "0")}
              disabled={showDisconnectMessage || showNoSharesMessage || wrongNetwork || withdrawLimit <= 0}
              className="rounded-lg border border-brand-gray/60 px-3 py-3 text-xs font-semibold text-brand-black hover:bg-brand-bg disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              Max
            </button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Available to withdraw:{" "}
            <span className="font-semibold text-brand-black">
              ${withdrawLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-brand-gray/40 p-3 dark:border-neutral-600">
          <p className="text-xs text-neutral-500">Your vault shares</p>
          <p className="mt-1 font-display text-sm font-bold text-brand-black">
            {shareBigInt.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Position value: ${positionUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        {withdrawAmount && (
          <div className="rounded-lg bg-brand-bg/50 p-4 dark:bg-neutral-800/50">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Requested USDC out:</span>
              <span className="font-semibold text-brand-black">
                ${parseFloat(withdrawAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300">
            <p className="font-semibold">⚠ Withdrawal issue</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
            <p className="font-semibold">✓ {success}</p>
            {method && (
              <p className="mt-1 text-[11px] text-green-600 dark:text-green-400">
                Method used: {method === "redeem" ? "Share redemption (fallback)" : "Asset withdrawal"}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleWithdraw}
          disabled={
            isLoading ||
            !withdrawAmount ||
            parseFloat(withdrawAmount) <= 0 ||
            showDisconnectMessage ||
            showNoSharesMessage ||
            wrongNetwork
          }
          className="w-full rounded-lg bg-red-500 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
        >
          {isLoading ? "Processing…" : "Withdraw USDC"}
        </button>

        {hash && (
          <p className="text-center text-xs text-neutral-600">
            Tx:{" "}
            <a
              href={`${EXPLORER}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline decoration-dotted hover:text-brand-green"
            >
              {hash.slice(0, 10)}…{hash.slice(-6)}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
