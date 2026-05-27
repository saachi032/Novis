import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";
import { RISK_TO_ENUM, DURATION_TO_ENUM } from "./useInvestmentStrategy";
import { useState, useCallback } from "react";

// Duration constants (in seconds)
export const DURATION_OPTIONS = {
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
  quarterly: 90 * 24 * 60 * 60,
  halfYearly: 180 * 24 * 60 * 60,
} as const;

export type DurationKey = keyof typeof DURATION_OPTIONS;

// Risk percentage constants (0-100)
export const RISK_PERCENTAGES = {
  conservative: 40,
  balanced: 60,
  aggressive: 80,
} as const;

export type RiskLevel = keyof typeof RISK_PERCENTAGES;

/**
 * Hook to read user's strategy (risk + duration) from RiskRegistry
 */
export function useUserStrategy(address?: string) {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
    abi: RISK_REGISTRY_ABI,
    functionName: "getUserStrategy",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 60_000,
      refetchInterval: 120_000,
    },
  });

  let riskLevel: RiskLevel = "balanced";
  let duration: DurationKey = "weekly";

  if (data) {
    const [riskPercentage, durationSeconds] = data;
    const riskNum = Number(riskPercentage);
    const durationNum = Number(durationSeconds);

    // Map risk percentage to level
    if (riskNum === RISK_PERCENTAGES.conservative) riskLevel = "conservative";
    else if (riskNum === RISK_PERCENTAGES.balanced) riskLevel = "balanced";
    else if (riskNum === RISK_PERCENTAGES.aggressive) riskLevel = "aggressive";

    // Map duration seconds to key
    const durationEntries = Object.entries(DURATION_OPTIONS);
    const matched = durationEntries.find(([_, seconds]) => seconds === durationNum);
    if (matched) {
      duration = matched[0] as DurationKey;
    }
  }

  return {
    riskLevel,
    duration,
    rawRiskPercentage: data ? Number(data[0]) : 0,
    rawDurationSeconds: data ? Number(data[1]) : 0,
    isLoading,
    error,
  };
}

/**
 * Hook to write strategy to RiskRegistry
 */
export function useSetStrategy() {
  const { address } = useAccount();
  const [isWritePending, setIsWritePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { writeContract, isPending } = useWriteContract();

  const setStrategy = useCallback(
    (riskLevel: RiskLevel, durationKey: DurationKey) => {
      return new Promise<void>((resolve, reject) => {
        setIsWritePending(true);
        setError(null);
        setSuccess(null);

        const riskEnum = RISK_TO_ENUM[riskLevel];
        const durationEnum = DURATION_TO_ENUM[durationKey];

        writeContract(
          {
            address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
            abi: RISK_REGISTRY_ABI,
            functionName: "setStrategy",
            args: [riskEnum, durationEnum],
            gas: BigInt(200000), // Strategy update is simple - update 2 state vars
          },
          {
            onSuccess: () => {
              setSuccess(
                `Strategy updated: ${riskLevel} risk, ${durationKey} checks`
              );
              setIsWritePending(false);
              resolve();
            },
            onError: (err) => {
              const errorMsg =
                err instanceof Error ? err.message : "Failed to update strategy";
              setError(errorMsg);
              setIsWritePending(false);
              reject(new Error(errorMsg));
            },
          }
        );
      });
    },
    [writeContract]
  );

  return {
    setStrategy,
    isLoading: isWritePending || isPending,
    error,
    success,
  };
}

/**
 * Hook to check if user can rebalance
 */
export function useCanRebalance(address?: string) {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
    abi: RISK_REGISTRY_ABI,
    functionName: "canRebalance",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 60_000,
      refetchInterval: 120_000,
    },
  });

  return {
    canRebalance: data ? Boolean(data) : false,
    isLoading,
    error,
  };
}
