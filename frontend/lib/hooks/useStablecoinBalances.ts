"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { formatUnits, getAddress } from "viem";
import { USDC_ABI } from "@/lib/abis/USDC";
import {
  BASE_SEPOLIA_USDT_BALANCE_ALTERNATES,
  getStablecoinOptions,
  type StablecoinId,
} from "@/lib/constants/stablecoins";
import { useHydrated } from "@/lib/hooks/useHydrated";

export type StableBalance = {
  raw: bigint;
  formatted: string;
  symbol: StablecoinId;
  decimals: number;
};

function uniqueAddresses(addrs: readonly `0x${string}`[]): `0x${string}`[] {
  const seen = new Set<string>();
  const out: `0x${string}`[] = [];
  for (const a of addrs) {
    const k = getAddress(a).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(getAddress(a) as `0x${string}`);
  }
  return out;
}

/**
 * ERC-20 balances for USDC, USDT, and DAI on the active chain (Base Sepolia / Base mainnet).
 * On Base Sepolia, USDT may exist on multiple contracts; balances are summed for display.
 */
export function useStablecoinBalances() {
  const { address } = useAccount();
  const chainId = useChainId();
  const hydrated = useHydrated();
  const options = useMemo(
    () => getStablecoinOptions(chainId) ?? [],
    [chainId]
  );

  const contracts = useMemo(() => {
    if (!options.length || !address) return [];
    const addr = address as `0x${string}`;
    const list: {
      address: `0x${string}`;
      abi: typeof USDC_ABI;
      functionName: "balanceOf";
      args: readonly [`0x${string}`];
    }[] = [];

    for (const o of options) {
      if (o.id === "USDT" && chainId === 84532) {
        const allUsdt = uniqueAddresses([
          o.address,
          ...BASE_SEPOLIA_USDT_BALANCE_ALTERNATES,
        ]);
        for (const token of allUsdt) {
          list.push({
            address: token,
            abi: USDC_ABI,
            functionName: "balanceOf",
            args: [addr],
          });
        }
      } else {
        list.push({
          address: o.address,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [addr],
        });
      }
    }

    return list;
  }, [options, address, chainId]);

  const { data, isPending, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: hydrated && !!address && contracts.length > 0,
    },
  });

  const balances = useMemo(() => {
    const out: Partial<Record<StablecoinId, StableBalance>> = {};
    if (!data?.length || !options.length) return out;

    let dataIdx = 0;

    for (const meta of options) {
      if (meta.id === "USDT" && chainId === 84532) {
        const allUsdt = uniqueAddresses([
          meta.address,
          ...BASE_SEPOLIA_USDT_BALANCE_ALTERNATES,
        ]);
        let sum = 0n;
        for (let j = 0; j < allUsdt.length; j++) {
          const res = data[dataIdx++];
          if (res?.status === "success") {
            sum += res.result as bigint;
          }
        }
        out.USDT = {
          raw: sum,
          formatted: formatUnits(sum, meta.decimals),
          symbol: "USDT",
          decimals: meta.decimals,
        };
      } else {
        const res = data[dataIdx++];
        if (!meta || res?.status !== "success") continue;
        const raw = res.result as bigint;
        out[meta.id] = {
          raw,
          formatted: formatUnits(raw, meta.decimals),
          symbol: meta.id,
          decimals: meta.decimals,
        };
      }
    }

    return out;
  }, [data, options, chainId]);

  /** Sum of wallet stable balances, treating each unit ≈ $1 (standard for stables). */
  const totalApproxUsd = useMemo(() => {
    let t = 0;
    for (const id of ["USDC", "USDT", "DAI"] as const) {
      const b = balances[id];
      if (b) t += Number(b.formatted);
    }
    if (!Number.isFinite(t)) return 0;
    return t;
  }, [balances]);

  return {
    balances,
    totalApproxUsd,
    options,
    isLoading: isPending,
    error,
    refetch,
    chainId,
  };
}
