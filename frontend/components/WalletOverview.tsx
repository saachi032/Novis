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
    <div className="space-y-3">
      {!isConnected || !address ? (
        <div className="surface-card rounded-2xl p-6">
          <p className="text-sm text-neutral-600">
            Connect a wallet on Base Sepolia to see your balances.
          </p>
        </div>
      ) : (
        <>
          {/* Balances Section */}
          <div className="grid grid-cols-2 gap-3">
            {/* USDC Balance Card */}
            <div className="surface-card rounded-2xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                USDC
              </h3>
              <p className="font-display text-2xl font-bold text-brand-black leading-tight">
                {!hydrated ? (
                  <span className="text-neutral-400 text-sm">—</span>
                ) : usdcLoading ? (
                  <span className="text-neutral-400 text-sm">Loading</span>
                ) : usdcBal && usdcBal.formatted ? (
                  `$${Number(usdcBal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}`
                ) : (
                  "0"
                )}
              </p>
            </div>

            {/* ETH Balance Card */}
            <div className="surface-card rounded-2xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                ETH
              </h3>
              <p className="font-display text-2xl font-bold text-brand-black leading-tight">
                {!hydrated ? (
                  <span className="text-neutral-400 text-sm">—</span>
                ) : ethLoading ? (
                  <span className="text-neutral-400 text-sm">Loading</span>
                ) : ethBal && ethBal.formatted ? (
                  `${Number(ethBal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 3,
                  })}`
                ) : (
                  "0"
                )}
              </p>
            </div>
          </div>

          {/* Wallet Address Card */}
          <div className="surface-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Wallet
            </h3>
            <p className="font-mono text-xs text-brand-black break-all font-medium">
              {shorten(address)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
