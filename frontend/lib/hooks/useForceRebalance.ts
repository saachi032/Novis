import { useAccount, useWriteContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { useState, useCallback } from "react";

export function useForceRebalance() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContract, isPending } = useWriteContract();

  const forceRebalance = useCallback(async () => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    return new Promise<void>((resolve, reject) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      writeContract(
        {
          address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
          abi: STRATEGY_ROUTER_ABI,
          functionName: "forceRebalance",
          args: [address as `0x${string}`],
        },
        {
          onSuccess: (hash) => {
            setSuccess("Rebalance triggered successfully!");
            setTxHash(hash);
            setIsLoading(false);
            resolve();
          },
          onError: (err) => {
            const errorMsg =
              err instanceof Error ? err.message : "Rebalance failed";
            setError(errorMsg);
            setIsLoading(false);
            reject(new Error(errorMsg));
          },
        }
      );
    });
  }, [address, writeContract]);

  return {
    forceRebalance,
    isLoading: isLoading || isPending,
    error,
    success,
    txHash,
  };
}
