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
  const [retryCount, setRetryCount] = useState(0);

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
      setRetryCount(0);

      // Rebalance involves withdrawing from one protocol and depositing to another
      // This requires multiple external calls and can be gas-intensive
      writeContract(
        {
          address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
          abi: STRATEGY_ROUTER_ABI,
          functionName: "forceRebalance",
          args: [address as `0x${string}`],
          gas: BigInt(800000), // Rebalance: withdraw + deposit to 2 protocols + state updates
        },
        {
          onSuccess: (hash) => {
            setSuccess("Rebalance triggered successfully! Funds being reallocated...");
            setTxHash(hash);
            setIsLoading(false);
            resolve();
          },
          onError: (err) => {
            const errorMsg = err instanceof Error ? err.message : "Rebalance failed";
            
            // Check if it's a gas error and we haven't retried
            if (errorMsg.includes("gas") && retryCount < 1) {
              console.warn("Gas estimation issue, retrying...");
              setRetryCount(prev => prev + 1);
              
              // Retry after 2 seconds
              setTimeout(() => {
                writeContract(
                  {
                    address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
                    abi: STRATEGY_ROUTER_ABI,
                    functionName: "forceRebalance",
                    args: [address as `0x${string}`],
                    gas: BigInt(800000), // Rebalance: withdraw + deposit to 2 protocols + state updates
                  },
                  {
                    onSuccess: (retryHash) => {
                      setSuccess("Rebalance triggered successfully! Funds being reallocated...");
                      setTxHash(retryHash);
                      setIsLoading(false);
                      resolve();
                    },
                    onError: (retryErr) => {
                      const retryMsg = retryErr instanceof Error ? retryErr.message : "Rebalance failed";
                      setError(retryMsg);
                      setIsLoading(false);
                      reject(new Error(retryMsg));
                    },
                  }
                );
              }, 2000);
            } else {
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            }
          },
        }
      );
    });
  }, [address, writeContract, retryCount]);

  return {
    forceRebalance,
    isLoading: isLoading || isPending,
    error,
    success,
    txHash,
    retryCount,
  };
}
