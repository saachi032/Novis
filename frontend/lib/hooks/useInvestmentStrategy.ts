import { useCallback, useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type DurationKey = "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly";

export const RISK_PERCENTAGES = {
  conservative: 40,
  balanced: 60,
  aggressive: 80,
} as const;

export const DURATION_OPTIONS = {
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
  quarterly: 90 * 24 * 60 * 60,
  halfYearly: 180 * 24 * 60 * 60,
} as const;

/**
 * Hook to set strategy for a specific investment (position-specific, not global)
 */
export function useSetInvestmentStrategy() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { writeContract, isPending } = useWriteContract();

  const setInvestmentStrategy = useCallback(
    (investmentId: string, riskLevel: RiskLevel, durationKey: DurationKey) => {
      return new Promise<void>((resolve, reject) => {
        if (!address) {
          reject(new Error("Wallet not connected"));
          return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const riskPercentage = RISK_PERCENTAGES[riskLevel];
        const durationSeconds = DURATION_OPTIONS[durationKey];

        writeContract(
          {
            address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
            abi: RISK_REGISTRY_ABI,
            functionName: "setStrategy",
            args: [BigInt(riskPercentage), BigInt(durationSeconds)],
          },
          {
            onSuccess: () => {
              setSuccess(
                `Investment strategy updated: ${riskLevel} risk, ${durationKey} checks`
              );
              setIsLoading(false);
              resolve();
            },
            onError: (err) => {
              const errorMsg =
                err instanceof Error ? err.message : "Failed to update strategy";
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            },
          }
        );
      });
    },
    [address, writeContract]
  );

  return {
    setInvestmentStrategy,
    isLoading: isLoading || isPending,
    error,
    success,
  };
}

/**
 * Store investment-specific settings in localStorage
 */
export function useInvestmentSettings(investmentId: string) {
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [duration, setDuration] = useState<DurationKey>("weekly");

  // Load from localStorage on mount
  const loadSettings = useCallback(() => {
    if (typeof window !== "undefined") {
      const key = `investment_${investmentId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const { risk: savedRisk, duration: savedDuration } = JSON.parse(saved);
        setRisk(savedRisk);
        setDuration(savedDuration);
      }
    }
  }, [investmentId]);

  // Save to localStorage
  const saveSettings = useCallback(
    (newRisk: RiskLevel, newDuration: DurationKey) => {
      if (typeof window !== "undefined") {
        const key = `investment_${investmentId}`;
        localStorage.setItem(
          key,
          JSON.stringify({ risk: newRisk, duration: newDuration })
        );
        setRisk(newRisk);
        setDuration(newDuration);
      }
    },
    [investmentId]
  );

  return {
    risk,
    duration,
    loadSettings,
    saveSettings,
  };
}
