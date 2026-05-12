import { useUserPositionBreakdown } from "@/lib/hooks/useUserPositionBreakdown";
import { useAccount } from "wagmi";

/**
 * Get user's allocation across protocols
 * Returns both Aave and Compound allocation percentages
 */
export function useUserProtocolAllocation() {
  const { address } = useAccount();
  const {
    aavePercentage,
    compoundPercentage,
    morphoPercentage,
    aaveBalanceBigInt,
    compoundBalanceBigInt,
    morphoBalanceBigInt,
  } = useUserPositionBreakdown(address);

  return {
    aaveAllocation: Number(aavePercentage),
    compoundAllocation: Number(compoundPercentage),
    morphoAllocation: Number(morphoPercentage),
    aaveBalance: aaveBalanceBigInt || 0n,
    compoundBalance: compoundBalanceBigInt || 0n,
    morphoBalance: morphoBalanceBigInt || 0n,
  };
}

/**
 * Get formatted user position across both protocols
 */
export function useUserProtocolBalance() {
  const { aaveBalance, compoundBalance, morphoBalance } =
    useUserProtocolAllocation();

  return {
    aaveBalance: (Number(aaveBalance) / 1e6).toFixed(2),
    compoundBalance: (Number(compoundBalance) / 1e6).toFixed(2),
    morphoBalance: (Number(morphoBalance) / 1e6).toFixed(2),
    totalBalance:
      ((Number(aaveBalance) + Number(compoundBalance) + Number(morphoBalance)) / 1e6).toFixed(2),
  };
}
