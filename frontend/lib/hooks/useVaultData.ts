import { useReadContract } from "wagmi";
import { BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { formatUSDC, bpsToPercentage } from "@/lib/utils/contractUtils";

/**
 * Shared query settings to prevent excessive RPC calls.
 * staleTime ensures wagmi deduplicates identical queries across components.
 * refetchIntervalInBackground: false stops polling when the tab is hidden.
 */
const SHARED_QUERY = {
  staleTime: 120_000,                 // data stays fresh for 2 min
  refetchInterval: 300_000,            // poll every 5 min
  refetchIntervalInBackground: false,  // stop when tab is hidden
  refetchOnMount: false as const,      // don't refetch on mount if data is fresh
} as const;

const APY_QUERY = {
  staleTime: 300_000,                  // APY changes slowly — 5 min fresh
  refetchInterval: 600_000,            // poll every 10 min
  refetchIntervalInBackground: false,
  refetchOnMount: false as const,
} as const;

/**
 * Get the total assets held in the vault
 */
export function useTotalAssets() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BASE_SEPOLIA_DEPLOYMENT.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "totalAssets",
    query: SHARED_QUERY,
  });

  return {
    totalAssets: data ? formatUSDC(data as bigint) : "0",
    totalAssetsBigInt: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get user's vault share balance
 */
export function useUserVaultShares(address?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BASE_SEPOLIA_DEPLOYMENT.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      ...SHARED_QUERY,
    },
  });

  return {
    shares: data ? formatUSDC(data as bigint) : "0",
    sharesBigInt: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get current APY for a lending protocol (bps on-chain).
 */
export function useProtocolAPY(protocol: "aave" | "compound" | "morpho") {
  const functionName =
    protocol === "aave" ? "getAaveAPY" : protocol === "compound" ? "getCompoundAPY" : "getMorphoAPY";

  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_DEPLOYMENT.strategyRouter,
    abi: STRATEGY_ROUTER_ABI,
    functionName,
    query: APY_QUERY,
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

  const apyValues = [aave.apy, compound.apy, morpho.apy]
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const blendedAPY =
    apyValues.length > 0
      ? apyValues.reduce((sum, value) => sum + value, 0) / apyValues.length
      : 0;

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
  const { totalAssetsBigInt, refetch: refetchTotalAssets } = useTotalAssets();
  const { sharesBigInt, refetch: refetchShares } = useUserVaultShares(userAddress);

  const { data: totalSupply, isLoading: totalSupplyLoading, refetch: refetchTotalSupply } = useReadContract({
    address: BASE_SEPOLIA_DEPLOYMENT.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "totalSupply",
    query: SHARED_QUERY,
  });

  let positionValue = "0";
  if (sharesBigInt && totalAssetsBigInt && totalSupply && totalSupply > 0n) {
    try {
      const valueBigInt = (sharesBigInt * totalAssetsBigInt) / totalSupply;
      positionValue = formatUSDC(valueBigInt);
    } catch {
      positionValue = "0";
    }
  }

  const refetch = async () => {
    await Promise.all([refetchTotalAssets?.(), refetchShares?.(), refetchTotalSupply?.()]);
  };

  return {
    positionValue,
    sharesBigInt,
    isLoading: totalSupplyLoading,
    error: null,
    refetch,
  };
}

/**
 * Maximum USDC the user can withdraw from the vault (ERC-4626 maxWithdraw).
 */
export function useMaxWithdraw(userAddress?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BASE_SEPOLIA_DEPLOYMENT.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "maxWithdraw",
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      ...SHARED_QUERY,
    },
  });

  return {
    maxWithdraw: data ? formatUSDC(data as bigint) : "0",
    maxWithdrawBigInt: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}
