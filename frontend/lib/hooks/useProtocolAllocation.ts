import { useUserVaultShares, useTotalAssets } from "@/lib/hooks/useVaultData";

/**
 * Get user's allocation across protocols
 * Returns both Aave and Compound allocation percentages
 */
export function useUserProtocolAllocation() {
  const { sharesBigInt } = useUserVaultShares();
  const { totalAssetsBigInt } = useTotalAssets();

  // Default allocation (this will be dynamic based on user strategy in future)
  const aaveAllocation = 42; // 42% Aave
  const compoundAllocation = 58; // 58% Compound

  return {
    aaveAllocation,
    compoundAllocation,
    totalShares: sharesBigInt || 0n,
    totalAssets: totalAssetsBigInt || 0n,
  };
}

/**
 * Get formatted user position across both protocols
 */
export function useUserProtocolBalance() {
  const { aaveAllocation, compoundAllocation, totalAssets } =
    useUserProtocolAllocation();

  const aaveBalance = (Number(totalAssets) * aaveAllocation) / 100;
  const compoundBalance = (Number(totalAssets) * compoundAllocation) / 100;

  return {
    aaveBalance: aaveBalance.toFixed(2),
    compoundBalance: compoundBalance.toFixed(2),
    totalBalance: Number(totalAssets).toFixed(2),
  };
}
