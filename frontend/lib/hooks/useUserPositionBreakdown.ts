import { useReadContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { formatUSDC } from "@/lib/utils/contractUtils";

/**
 * Get user's position breakdown across Aave, Compound, and Morpho.
 */
export function useUserPositionBreakdown(userAddress?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
    abi: STRATEGY_ROUTER_ABI,
    functionName: "getUserProtocolBalances",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    },
  });

  if (!data || !userAddress) {
    return {
      aaveBalance: "0",
      compoundBalance: "0",
      morphoBalance: "0",
      aaveBalanceBigInt: undefined,
      compoundBalanceBigInt: undefined,
      morphoBalanceBigInt: undefined,
      total: "0",
      aavePercentage: 0,
      compoundPercentage: 0,
      morphoPercentage: 0,
      isLoading,
      error,
    };
  }

  const [aaveBal, compoundBal, morphoBal] = data as [bigint, bigint, bigint];
  const aaveStr = formatUSDC(aaveBal);
  const compoundStr = formatUSDC(compoundBal);
  const morphoStr = formatUSDC(morphoBal);

  const aaveNum = parseFloat(aaveStr);
  const compoundNum = parseFloat(compoundStr);
  const morphoNum = parseFloat(morphoStr);
  const total = aaveNum + compoundNum + morphoNum;

  const aavePercentage = total > 0 ? (aaveNum / total) * 100 : 0;
  const compoundPercentage = total > 0 ? (compoundNum / total) * 100 : 0;
  const morphoPercentage = total > 0 ? (morphoNum / total) * 100 : 0;

  return {
    aaveBalance: aaveStr,
    compoundBalance: compoundStr,
    morphoBalance: morphoStr,
    aaveBalanceBigInt: aaveBal,
    compoundBalanceBigInt: compoundBal,
    morphoBalanceBigInt: morphoBal,
    total: total.toFixed(2),
    aavePercentage: aavePercentage.toFixed(1),
    compoundPercentage: compoundPercentage.toFixed(1),
    morphoPercentage: morphoPercentage.toFixed(1),
    isLoading,
    error,
    refetch,
  };
}
