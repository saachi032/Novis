import { useReadContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { formatUSDC, bpsToPercentage } from "@/lib/utils/contractUtils";

/**
 * Get the total assets held in the vault
 */
export function useTotalAssets() {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "totalAssets",
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  return {
    totalAssets: data ? formatUSDC(data as bigint) : "0",
    totalAssetsBigInt: data as bigint | undefined,
    isLoading,
    error,
  };
}

/**
 * Get user's vault share balance
 */
export function useUserVaultShares(address?: string) {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  return {
    shares: data ? formatUSDC(data as bigint) : "0",
    sharesBigInt: data as bigint | undefined,
    isLoading,
    error,
  };
}

/**
 * Get current APY for specific protocol (Aave or Compound)
 */
export function useProtocolAPY(protocol: "aave" | "compound") {
  const functionName = protocol === "aave" ? "getAaveAPY" : "getCompoundAPY";

  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
    abi: STRATEGY_ROUTER_ABI,
    functionName,
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    apy: data ? bpsToPercentage(data as bigint) : "0",
    apyBps: data as bigint | undefined,
    isLoading,
    error,
  };
}

/**
 * Get both Aave and Compound APYs
 */
export function useVaultAPYs() {
  const aave = useProtocolAPY("aave");
  const compound = useProtocolAPY("compound");

  const aaveRate = parseFloat(aave.apy);
  const compoundRate = parseFloat(compound.apy);

  // Calculate blended APY (weighted average)
  // Default allocation is 42% Aave, 58% Compound (from current demo)
  const blendedAPY = aaveRate * 0.42 + compoundRate * 0.58;

  return {
    aaveAPY: aave.apy,
    compoundAPY: compound.apy,
    blendedAPY: blendedAPY.toFixed(2),
    isLoading: aave.isLoading || compound.isLoading,
    error: aave.error || compound.error,
  };
}

/**
 * Calculate user's position value in USD
 * Position = shares * (totalAssets / totalSupply)
 */
export function useUserPositionValue(userAddress?: string) {
  const { totalAssetsBigInt } = useTotalAssets();
  const { sharesBigInt } = useUserVaultShares(userAddress);

  const { data: totalSupply, isLoading: totalSupplyLoading } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "totalSupply",
    query: {
      refetchInterval: 10000,
    },
  });

  // If shares exist, calculate position value
  // Simplified: 1 share = total assets / total shares (share price)
  let positionValue = "0";
  if (sharesBigInt && totalAssetsBigInt && totalSupply !== undefined) {
    try {
      // Share price = totalAssets / totalSupply
      // Position value = userShares * (totalAssets / totalSupply)
      // For now, use 1-to-1 mapping as placeholder
      const value = formatUSDC(sharesBigInt);
      positionValue = value;
    } catch {
      positionValue = "0";
    }
  }

  return {
    positionValue,
    sharesBigInt,
    isLoading: totalSupplyLoading,
    error: null,
  };
}
