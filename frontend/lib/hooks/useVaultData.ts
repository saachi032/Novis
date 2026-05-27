import { useReadContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { formatUSDC, bpsToPercentage } from "@/lib/utils/contractUtils";

/**
 * Shared query settings to prevent excessive RPC calls.
 * staleTime ensures wagmi deduplicates identical queries across components.
 * refetchInterval is set to 2 minutes (was 30s) to reduce polling frequency.
 */
const SHARED_QUERY = {
  staleTime: 60_000,       // data stays fresh for 60s — no duplicate fetches
  refetchInterval: 120_000, // poll every 2 min instead of 30s
} as const;

/**
 * Get the total assets held in the vault
 */
export function useTotalAssets() {
  const { data, isLoading, error } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "totalAssets",
    query: SHARED_QUERY,
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
      ...SHARED_QUERY,
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
      staleTime: 120_000,      // APY changes slowly — keep fresh for 2 min
      refetchInterval: 300_000, // poll every 5 min (was 60s)
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

  return {
    positionValue,
    sharesBigInt,
    isLoading: totalSupplyLoading,
    error: null,
  };
}
