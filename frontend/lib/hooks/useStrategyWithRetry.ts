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
          // Attempt to set strategy
          const txHash = await baseSetStrategy(investmentId, riskLevel, durationKey);
          
          // Success!
          console.log(`✓ Strategy set on attempt ${attempt + 1}`, txHash);
          return txHash;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const errorMsg = lastError.message || "";
          
          console.warn(
            `Strategy attempt ${attempt + 1} failed:`,
            errorMsg
          );

          // Check if it's worth retrying
          const isRetryableError =
            errorMsg.includes("gas") ||
            errorMsg.includes("timeout") ||
            errorMsg.includes("network") ||
            errorMsg.includes("TIMEOUT") ||
            errorMsg.includes("failed");

          if (isRetryableError && attempt < MAX_RETRIES) {
            // Wait before retrying (exponential backoff)
            const waitTime = 2000 * (attempt + 1);
            console.log(`Retrying strategy in ${waitTime}ms... (attempt ${attempt + 2}/${MAX_RETRIES + 1})`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          // Non-retryable error or out of retries
          if (attempt === MAX_RETRIES) {
            break; // Exit retry loop
          }
        }
      }

      // Log final error but don't throw; callers decide whether to continue.
      console.warn(
        "⚠️  Strategy setting failed:",
        lastError?.message
      );
      
      // Return silently - don't block the user
      return null;
    },
    [baseSetStrategy]
  );

  return {
    setInvestmentStrategy: setInvestmentStrategyWithRetry,
  };
}
