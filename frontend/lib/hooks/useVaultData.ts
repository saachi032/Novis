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
    args: address ? [address as `0x${string}`] : undefined,
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
 * Get current APY for a lending protocol (bps on-chain).
 */
export function useProtocolAPY(protocol: "aave" | "compound" | "morpho") {
  const functionName =
    protocol === "aave" ? "getAaveAPY" : protocol === "compound" ? "getCompoundAPY" : "getMorphoAPY";

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
 * Get Aave, Compound, and Morpho APYs (simple average for a rough blended headline).
 */
export function useVaultAPYs() {
  const aave = useProtocolAPY("aave");
  const compound = useProtocolAPY("compound");
  const morpho = useProtocolAPY("morpho");

  const aaveRate = parseFloat(aave.apy);
  const compoundRate = parseFloat(compound.apy);
  const morphoRate = parseFloat(morpho.apy);
  const blendedAPY = (aaveRate + compoundRate + morphoRate) / 3;

  return {
    aaveAPY: aave.apy,
    compoundAPY: compound.apy,
    morphoAPY: morpho.apy,
    blendedAPY: blendedAPY.toFixed(2),
    isLoading: aave.isLoading || compound.isLoading || morpho.isLoading,
    error: aave.error || compound.error || morpho.error,
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
