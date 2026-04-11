import { useCallback, useState } from "react";
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
  const { writeContract, isPending } = useWriteContract();
  const [hash, setHash] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "approving" | "depositing">("idle");

  const depositIntoVault = useCallback(
    (amount: string) => {
      return new Promise<void>((resolve, reject) => {
        if (!address) {
          reject(new Error("Wallet not connected"));
          return;
        }

        const parsedAmount = parseUSDC(amount);

        // Step 1: Approve USDC spending
        setStep("approving");
        writeContract(
          {
            address: BASE_SEPOLIA_ADDRESSES.usdc,
            abi: USDC_ABI,
            functionName: "approve",
            args: [BASE_SEPOLIA_ADDRESSES.vaultManager, parsedAmount],
          },
          {
            onSuccess: () => {
              // Wait a moment for approval to settle, then deposit
              setTimeout(() => {
                setStep("depositing");
                writeContract(
                  {
                    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
                    abi: VAULT_MANAGER_ABI,
                    functionName: "deposit",
                    args: [parsedAmount, address],
                  },
                  {
                    onSuccess: (txHash) => {
                      setHash(txHash);
                      setStep("idle");
                      resolve();
                    },
                    onError: (err) => {
                      setStep("idle");
                      reject(err);
                    },
                  }
                );
              }, 1000);
            },
            onError: (err) => {
              setStep("idle");
              reject(err);
            },
          }
        );
      });
    },
    [address, writeContract]
  );

  return {
    depositIntoVault,
    isLoading: isPending || step !== "idle",
    hash,
    step,
  };
}

/**
 * Hook for withdrawing (redeeming shares) from the vault
 */
export function useWithdraw() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [hash, setHash] = useState<string | null>(null);

  const withdraw = useCallback(
    (shares: string) => {
      return new Promise<void>((resolve, reject) => {
        if (!address) {
          reject(new Error("Wallet not connected"));
          return;
        }

        const parsedShares = parseUSDC(shares);

        // Redeem shares from vault
        writeContract(
          {
            address: BASE_SEPOLIA_ADDRESSES.vaultManager,
            abi: VAULT_MANAGER_ABI,
            functionName: "redeem",
            args: [parsedShares, address, address],
          },
          {
            onSuccess: (txHash) => {
              setHash(txHash);
              resolve();
            },
            onError: (err) => {
              reject(err);
            },
          }
        );
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
