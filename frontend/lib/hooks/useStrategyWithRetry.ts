import { useCallback } from "react";
import { useSetInvestmentStrategy, type RiskLevel, type DurationKey } from "./useInvestmentStrategy";

/**
 * Wrapper hook for setStrategy with automatic retry logic.
 * Callers can decide whether a deposit should continue when strategy setup fails.
 */
export function useStrategyWithRetry() {
  const { setInvestmentStrategy: baseSetStrategy } = useSetInvestmentStrategy();

  const setInvestmentStrategyWithRetry = useCallback(
    async (investmentId: string, riskLevel: RiskLevel, durationKey: DurationKey) => {
      const MAX_RETRIES = 2;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const txHash = await baseSetStrategy(investmentId, riskLevel, durationKey);
          return txHash;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const errorMsg = lastError.message || "";

          const isRetryableError =
            errorMsg.includes("gas") ||
            errorMsg.includes("timeout") ||
            errorMsg.includes("network") ||
            errorMsg.includes("TIMEOUT") ||
            errorMsg.includes("failed");

          if (isRetryableError && attempt < MAX_RETRIES) {
            const waitTime = 2000 * (attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          if (attempt === MAX_RETRIES) {
            break;
          }
        }
      }

      return null;
    },
    [baseSetStrategy]
  );

  return {
    setInvestmentStrategy: setInvestmentStrategyWithRetry,
  };
}
