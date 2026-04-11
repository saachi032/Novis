import { useCallback, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type DurationKey = "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly";

export const RISK_PERCENTAGES = {
  conservative: 40,
  balanced: 60,
  aggressive: 80,
} as const;

// Map risk levels to RiskProfile enum values in contract (Low=0, Medium=1, High=2)
export const RISK_TO_ENUM = {
  conservative: 0, // Low
  balanced: 1,     // Medium
  aggressive: 2,   // High
} as const;

export const DURATION_OPTIONS = {
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
  quarterly: 90 * 24 * 60 * 60,
  halfYearly: 180 * 24 * 60 * 60,
} as const;

// Map duration keys to CheckingDuration enum values in contract (Daily=0, Weekly=1, Monthly=2, Quarterly=3, HalfYearly=4)
export const DURATION_TO_ENUM = {
  daily: 0,      // Daily
  weekly: 1,     // Weekly
  monthly: 2,    // Monthly
  quarterly: 3,  // Quarterly
  halfYearly: 4, // HalfYearly
} as const;

/**
 * Hook to set strategy for a specific investment (position-specific, not global)
 */
export function useSetInvestmentStrategy() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();

  const setInvestmentStrategy = useCallback(
    (investmentId: string, riskLevel: RiskLevel, durationKey: DurationKey) => {
      return new Promise<void>((resolve, reject) => {
        if (!address) {
          reject(new Error("Wallet not connected"));
          return;
        }

        // Map risk level and duration to contract enum values
        const riskEnum = RISK_TO_ENUM[riskLevel];
        const durationEnum = DURATION_TO_ENUM[durationKey];

        try {
          writeContract(
            {
              address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
              abi: RISK_REGISTRY_ABI,
              functionName: "setStrategy",
              args: [riskEnum, durationEnum],
              // Don't set explicit gas - let viem estimate it naturally
            },
            {
              onSuccess: () => {
                console.log("Strategy set successfully");
                resolve();
              },
              onError: (err) => {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                console.error("Strategy setting error:", errorMsg);
                reject(new Error(errorMsg));
              },
            }
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Failed to set strategy";
          reject(new Error(errorMsg));
        }
      });
    },
    [address, writeContract]
  );

  return {
    setInvestmentStrategy,
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
