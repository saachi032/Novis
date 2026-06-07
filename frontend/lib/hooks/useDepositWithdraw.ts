import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useChainId,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getVaultManagerAddress, BASE_SEPOLIA_DEPLOYMENT } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { USDC_ABI } from "@/lib/abis/USDC";
import { parseUSDC, formatUSDC } from "@/lib/utils/contractUtils";
import type { StablecoinId } from "@/lib/constants/stablecoins";

export type DepositStep =
  | "idle"
  | "approving"
  | "depositing"
  | "zapping";

const ZERO = "0x0000000000000000000000000000000000000000";
const CHAIN_ID = 84532;
const WITHDRAW_GAS = 1_500_000n;

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
      if (chainId !== CHAIN_ID) {
        throw new Error("Switch your wallet to Base Sepolia to use this vault.");
      }
      if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
        throw new Error("Vault not configured for this network");
      }

      if (asset !== "USDC") {
        throw new Error("This deployment currently supports USDC deposits only.");
      }

      const parsed = parseUSDC(amount);

      try {
        // 1. Check user balance first to provide a clear error
        const userBalance = (await publicClient.readContract({
          address: BASE_SEPOLIA_DEPLOYMENT.usdc,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;

        if (parsed > userBalance) {
          throw new Error(
            `Insufficient balance. You only have ${formatUSDC(userBalance)} testnet USDC.`
          );
        }

        setStep("approving");
        // We skip simulating approve to save RPC calls and avoid rate limits on public nodes
        const approveHash = await writeContractAsync({
          address: BASE_SEPOLIA_DEPLOYMENT.usdc,
          abi: USDC_ABI,
          functionName: "approve",
          args: [vaultManagerAddress, parsed],
          gas: 100_000n,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") {
          throw new Error("USDC approval reverted on-chain");
        }

        setStep("depositing");
        
        // 2. Simulate deposit to catch contract reverts gracefully
        try {
          await publicClient.simulateContract({
            account: address,
            address: vaultManagerAddress,
            abi: VAULT_MANAGER_ABI,
            functionName: "deposit",
            args: [parsed, address],
          });
        } catch (simErr: any) {
          console.error("Deposit simulation failed:", simErr);
          throw new Error(`Deposit simulation failed: ${simErr.message || "Unknown error"}`);
        }

        const depositHash = await writeContractAsync({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "deposit",
          args: [parsed, address],
          gas: 800_000n,
        });
        const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
        if (depositReceipt.status !== "success") {
          throw new Error("Vault deposit reverted on-chain");
        }
        setHash(depositHash);
        return depositHash;
      } catch (err: any) {
        console.error("Deposit error:", err);
        throw err;
      } finally {
        setStep("idle");
      }
    },
    [address, chainId, publicClient, vaultManagerAddress, writeContractAsync]
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
 * Hook for withdrawing USDC from the vault.
 * Tries ERC-4626 `withdraw(assets,receiver,owner)` first.
 * If the simulation fails (common in demo mode where StrategyRouter cannot
 * transfer USDC it never actually pulled from protocols), falls back to
 * `redeem(shares,receiver,owner)` which burns shares for whatever the vault
 * can pay out from idle USDC.
 */
export function useWithdraw() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [hash, setHash] = useState<string | null>(null);
  const [method, setMethod] = useState<"withdraw" | "redeem" | null>(null);

  const vaultManagerAddress = getVaultManagerAddress(chainId);

  const invalidateVaultReads = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [queryClient]);

  const withdraw = useCallback(
    async (assets: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }
      if (chainId !== CHAIN_ID) {
        throw new Error("Switch your wallet to Base Sepolia to withdraw.");
      }
      if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
        throw new Error("Vault not configured for this network");
      }
      if (!publicClient) {
        throw new Error("Public client unavailable");
      }

      const parsedAssets = parseUSDC(assets);
      if (parsedAssets <= 0n) {
        throw new Error("Enter a valid withdrawal amount");
      }

      // Check maxWithdraw first
      const maxWithdrawAmt = (await publicClient.readContract({
        address: vaultManagerAddress,
        abi: VAULT_MANAGER_ABI,
        functionName: "maxWithdraw",
        args: [address],
      })) as bigint;

      if (parsedAssets > maxWithdrawAmt) {
        throw new Error(
          `Maximum withdrawable amount is ${formatUSDC(maxWithdrawAmt)} USDC`
        );
      }

      // ── Attempt 1: standard ERC-4626 withdraw(assets, receiver, owner) ──
      try {
        await publicClient.simulateContract({
          account: address,
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "withdraw",
          args: [parsedAssets, address, address],
        });

        setMethod("withdraw");
        const txHash = await writeContractAsync({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "withdraw",
          args: [parsedAssets, address, address],
          gas: WITHDRAW_GAS,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") {
          throw new Error("Vault withdrawal reverted on-chain");
        }
        setHash(txHash);
        await invalidateVaultReads();
        return;
      } catch (withdrawErr) {
        // withdraw() failed — try redeem() as fallback
        console.warn("withdraw() failed, trying redeem() fallback:", withdrawErr);
      }

      // ── Attempt 2: redeem via shares ──
      // Calculate how many shares correspond to the requested assets
      try {
        const sharesToRedeem = (await publicClient.readContract({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "previewWithdraw",
          args: [parsedAssets],
        })) as bigint;

        if (sharesToRedeem <= 0n) {
          throw new Error("Cannot calculate shares for this withdrawal amount.");
        }

        // Simulate redeem
        await publicClient.simulateContract({
          account: address,
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "redeem",
          args: [sharesToRedeem, address, address],
        });

        setMethod("redeem");
        const txHash = await writeContractAsync({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "redeem",
          args: [sharesToRedeem, address, address],
          gas: WITHDRAW_GAS,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") {
          throw new Error("Vault redemption reverted on-chain");
        }
        setHash(txHash);
        await invalidateVaultReads();
        return;
      } catch (redeemErr) {
        const message =
          redeemErr instanceof Error ? redeemErr.message : "Withdrawal failed";

        // Provide actionable guidance
        if (
          message.toLowerCase().includes("insufficient") ||
          message.toLowerCase().includes("exceeds") ||
          message.toLowerCase().includes("transfer amount")
        ) {
          throw new Error(
            "Withdrawal failed: the vault may be in demo mode where funds are tracked but not actually deposited into lending protocols. " +
            "The contract owner needs to call setDemoMode(false) or ensure the vault holds sufficient idle USDC. " +
            "Try a smaller amount or contact the protocol team."
          );
        }
        throw new Error(`Withdrawal failed: ${message.slice(0, 250)}`);
      }
    },
    [address, chainId, publicClient, vaultManagerAddress, writeContractAsync, invalidateVaultReads]
  );

  return {
    withdraw,
    isLoading: isPending,
    hash,
    method,
  };
}
