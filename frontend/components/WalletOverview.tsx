"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { useUserVaultShares, useTotalAssets } from "@/lib/hooks/useVaultData";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { useHydrated } from "@/lib/hooks/useHydrated";

// Use Base Sepolia testnet USDC address
const USDC_ADDRESS = BASE_SEPOLIA_ADDRESSES.usdc;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletOverview() {
  const hydrated = useHydrated();
  const { address, isConnected } = useAccount();
  
  // USDC Balance
  const { data: usdcBal, isLoading: usdcLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    token: USDC_ADDRESS as `0x${string}`,
    query: { 
      enabled: !!address && hydrated,
      refetchInterval: 10000,
    },
  });
  
  // Native ETH Balance
  const { data: ethBal, isLoading: ethLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { 
      enabled: !!address && hydrated,
      refetchInterval: 10000,
    },
  });
  
  const { shares } = useUserVaultShares(address);
  const { totalAssets } = useTotalAssets();

  return (
    <div className="space-y-4">
      {!isConnected || !address ? (
        <div className="surface-card rounded-2xl p-6">
          <p className="text-sm text-neutral-600">
            Connect a wallet on Base Sepolia to see your balances.
          </p>
        </div>
      ) : (
        <>
          {/* Balances Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* USDC Balance Card */}
            <div className="surface-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  USDC Balance
                </h3>
                <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                  <span className="text-sm">💵</span>
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-brand-black">
                {!hydrated ? (
                  <span className="text-neutral-400 text-xl">—</span>
                ) : usdcLoading ? (
                  <span className="text-neutral-400 text-lg">Loading...</span>
                ) : usdcBal && usdcBal.formatted ? (
                  `$${Number(usdcBal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  "0"
                )}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{usdcBal?.symbol || "USDC"}</p>
            </div>

            {/* ETH Balance Card */}
            <div className="surface-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  ETH Balance
                </h3>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm">Ξ</span>
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-brand-black">
                {!hydrated ? (
                  <span className="text-neutral-400 text-xl">—</span>
                ) : ethLoading ? (
                  <span className="text-neutral-400 text-lg">Loading...</span>
                ) : ethBal && ethBal.formatted ? (
                  `${Number(ethBal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}`
                ) : (
                  "0"
                )}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{ethBal?.symbol || "ETH"}</p>
            </div>
          </div>

          {/* Wallet Address Card */}
          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              Wallet Address
            </h3>
            <p className="font-mono text-sm text-brand-black break-all font-semibold">
              {address}
            </p>
            <p className="mt-2 text-xs text-neutral-500">Connected to Base Sepolia</p>
          </div>

          {/* Vault Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Vault Shares Card */}
            <div className="surface-card rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                Vault Shares
              </h3>
              <p className="font-display text-xl font-bold text-brand-black">
                {shares && shares !== "0"
                  ? `${Number(shares).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`
                  : "0"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Position</p>
            </div>

            {/* Total Assets Card */}
            <div className="surface-card rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                Total Assets
              </h3>
              <p className="font-display text-xl font-bold text-brand-green">
                ${Number(totalAssets).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-1 text-xs text-neutral-500">In vault</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
