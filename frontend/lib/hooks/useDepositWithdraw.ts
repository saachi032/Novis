import { useCallback } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { USDC_ABI } from "@/lib/abis/USDC";
import { parseUSDC } from "@/lib/utils/contractUtils";

/**
 * Hook for depositing USDC into the vault
 */
export function useDeposit() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const deposit = useCallback(
    async (amount: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const parsedAmount = parseUSDC(amount);

      // First, approve the vault to spend USDC
      writeContract({
        address: BASE_SEPOLIA_ADDRESSES.usdc,
        abi: USDC_ABI,
        functionName: "approve",
        args: [BASE_SEPOLIA_ADDRESSES.vaultManager, parsedAmount],
      });
    },
    [address, writeContract]
  );

  const depositIntoVault = useCallback(
    async (amount: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const parsedAmount = parseUSDC(amount);

      // Deposit into vault
      writeContract({
        address: BASE_SEPOLIA_ADDRESSES.vaultManager,
        abi: VAULT_MANAGER_ABI,
        functionName: "deposit",
        args: [parsedAmount, address],
      });
    },
    [address, writeContract]
  );

  return {
    deposit,
    depositIntoVault,
    isLoading: isPending,
    hash,
  };
}

/**
 * Hook for withdrawing (redeeming shares) from the vault
 */
export function useWithdraw() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const withdraw = useCallback(
    async (shares: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const parsedShares = parseUSDC(shares);

      // Redeem shares from vault
      writeContract({
        address: BASE_SEPOLIA_ADDRESSES.vaultManager,
        abi: VAULT_MANAGER_ABI,
        functionName: "redeem",
        args: [parsedShares, address, address],
      });
    },
    [address, writeContract]
  );

  return {
    withdraw,
    isLoading: isPending,
    hash,
  };
}
