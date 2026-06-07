import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import { getVaultManagerAddress } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { USDC_ABI } from "@/lib/abis/USDC";
import { parseUSDC } from "@/lib/utils/contractUtils";
import type { StablecoinId } from "@/lib/constants/stablecoins";

export type DepositStep =
  | "idle"
  | "approving"
  | "depositing"
  | "zapping";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Deposit USDC via ERC-4626 `deposit`.
 * The current deployment is USDC-only, so non-USDC assets are rejected here.
 */
export function useDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<string | null>(null);
  const [step, setStep] = useState<DepositStep>("idle");

  const vaultManagerAddress = useMemo(
    () => getVaultManagerAddress(chainId),
    [chainId]
  );
  const zapperStatus: "loading" | "on" | "off" = "off";
  const zapperEnabled = false;

  const depositIntoVault = useCallback(
    async (amount: string, asset: StablecoinId) => {
      if (!address || !publicClient) {
        throw new Error("Wallet not connected");
      }
      if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
        throw new Error("Vault not configured for this network");
      }

      if (asset !== "USDC") {
        throw new Error("This deployment currently supports USDC deposits only.");
      }

      const parsed = parseUSDC(amount);

      try {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          abi: USDC_ABI,
          functionName: "approve",
          args: [vaultManagerAddress, parsed],
          gas: 100_000n,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") {
          throw new Error("USDC approval reverted");
        }

        setStep("depositing");
        const depositHash = await writeContractAsync({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "deposit",
          args: [parsed, address],
          gas: 800_000n,
        });
        const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
        if (depositReceipt.status !== "success") {
          throw new Error("Vault deposit reverted");
        }
        setHash(depositHash);
        return depositHash;
      } finally {
        setStep("idle");
      }
    },
    [
      address,
      chainId,
      publicClient,
      vaultManagerAddress,
      writeContractAsync,
    ]
  );

  const isLoading = isPending || step !== "idle";

  return {
    depositIntoVault,
    isLoading,
    hash,
    step,
    zapperEnabled,
    zapperStatus,
    vaultManagerAddress,
  };
}

/**
 * Hook for withdrawing USDC from the vault
 */
export function useWithdraw() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [hash, setHash] = useState<string | null>(null);

  const vaultManagerAddress = getVaultManagerAddress(chainId);

  const withdraw = useCallback(
    async (assets: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }
      if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
        throw new Error("Vault not configured for this network");
      }
      if (!publicClient) {
        throw new Error("Public client unavailable");
      }

      const parsedAssets = parseUSDC(assets);
      const txHash = await writeContractAsync({
        address: vaultManagerAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "withdraw",
        args: [parsedAssets, address, address],
        gas: 800_000n,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Vault withdrawal reverted");
      }
      setHash(txHash);
    },
    [address, chainId, publicClient, vaultManagerAddress, writeContractAsync]
  );

  return {
    withdraw,
    isLoading: isPending,
    hash,
  };
}
