import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { useState, useCallback } from "react";

export function useForceRebalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { writeContractAsync, isPending } = useWriteContract();

  const forceRebalance = useCallback(async () => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }
    if (!publicClient) {
      setError("Public client unavailable");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);
    setRetryCount(0);

    try {
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          const hash = await writeContractAsync({
            address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
            abi: STRATEGY_ROUTER_ABI,
            functionName: "forceRebalance",
            args: [address as `0x${string}`],
            gas: BigInt(1_200_000),
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status !== "success") {
            throw new Error("Rebalance transaction reverted");
          }
          setSuccess("Rebalance completed successfully. Funds were reallocated on-chain.");
          setTxHash(hash);
          return hash;
        } catch (innerErr) {
          const innerMsg = innerErr instanceof Error ? innerErr.message : "Rebalance failed";
          const retryable = innerMsg.includes("gas") || innerMsg.includes("timeout");
          if (!retryable || attempt === 1) {
            throw new Error(innerMsg);
          }
          setRetryCount((prev) => prev + 1);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      throw new Error("Rebalance failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Rebalance failed";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, retryCount, writeContractAsync]);

  return {
    forceRebalance,
    isLoading: isLoading || isPending,
    error,
    success,
    txHash,
    retryCount,
  };
}
