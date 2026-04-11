import { useReadContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { formatUSDC } from "@/lib/utils/contractUtils";

/**
 * Get user's position breakdown - how much is in Aave vs Compound
 */
export function useUserPositionBreakdown(userAddress?: string) {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
    abi: STRATEGY_ROUTER_ABI,
    functionName: "getUserPosition",
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
      aaveBalanceBigInt: undefined,
      compoundBalanceBigInt: undefined,
      total: "0",
      aavePercentage: 0,
      compoundPercentage: 0,
      isLoading,
      error,
    };
  }

  // data is [aaveBalance, compoundBalance] tuple
  const [aaveBal, compoundBal] = data as [bigint, bigint];
  const aaveStr = formatUSDC(aaveBal);
  const compoundStr = formatUSDC(compoundBal);
  
  const aaveNum = parseFloat(aaveStr);
  const compoundNum = parseFloat(compoundStr);
  const total = aaveNum + compoundNum;
  
  const aavePercentage = total > 0 ? (aaveNum / total) * 100 : 0;
  const compoundPercentage = total > 0 ? (compoundNum / total) * 100 : 0;

  return {
    aaveBalance: aaveStr,
    compoundBalance: compoundStr,
    aaveBalanceBigInt: aaveBal,
    compoundBalanceBigInt: compoundBal,
    total: total.toFixed(2),
    aavePercentage: aavePercentage.toFixed(1),
    compoundPercentage: compoundPercentage.toFixed(1),
    isLoading,
    error,
  };
}
