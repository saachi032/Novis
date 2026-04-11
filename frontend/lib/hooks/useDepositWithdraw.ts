import { useCallback, useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { USDC_ABI } from "@/lib/abis/USDC";
import { parseUSDC } from "@/lib/utils/contractUtils";

/**
 * Hook for depositing USDC into the vault
 */
export function useDeposit() {
  const { address } = useAccount();
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const publicClient = usePublicClient();
  const [hash, setHash] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "approving" | "depositing">("idle");
  const [approveTxHash, setApproveTxHash] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  
  // Wait for approval to be mined
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash ? (approveTxHash as `0x${string}`) : undefined,
    query: {
      enabled: !!approveTxHash,
    },
  });

  const depositIntoVault = useCallback(
    (amount: string) => {
      return new Promise<string>((resolve, reject) => {
        if (!address || !publicClient) {
          reject(new Error("Wallet not connected"));
          return;
        }

        const parsedAmount = parseUSDC(amount);
        setDepositAmount(amount);

        // Step 1: Approve USDC spending
        setStep("approving");
        writeContract(
          {
            address: BASE_SEPOLIA_ADDRESSES.usdc,
            abi: USDC_ABI,
            functionName: "approve",
            args: [BASE_SEPOLIA_ADDRESSES.vaultManager, parsedAmount],
            gas: BigInt(100000), // Approval doesn't need much gas
          },
          {
            onSuccess: (approvHash) => {
              setApproveTxHash(approvHash);
              
              // Wait for approval to be mined, then proceed with deposit
              const waitInterval = setInterval(async () => {
                try {
                  const receipt = await publicClient.getTransactionReceipt({
                    hash: approvHash,
                  });

                  if (receipt && receipt.status === "success") {
                    clearInterval(waitInterval);
                    
                    // Approval confirmed! Now do deposit with safe gas limit
                    setStep("depositing");
                    writeContract(
                      {
                        address: BASE_SEPOLIA_ADDRESSES.vaultManager,
                        abi: VAULT_MANAGER_ABI,
                        functionName: "deposit",
                        args: [parsedAmount, address],
                        gas: BigInt(800000), // Deposit is complex: ERC4626 + StrategyRouter + 2 protocol deposits
                      },
                      {
                        onSuccess: (depositHash) => {
                          setHash(depositHash);
                          setStep("idle");
                          resolve(depositHash); // Return the actual hash
                        },
                        onError: (err) => {
                          setStep("idle");
                          reject(err);
                        },
                      }
                    );
                  }
                } catch (err) {
                  console.debug("Waiting for approval...");
                }
              }, 2000); // Check every 2 seconds

              // Timeout after 60 seconds
              setTimeout(() => {
                clearInterval(waitInterval);
                setStep("idle");
                reject(new Error("Approval confirmation timeout"));
              }, 60000);
            },
            onError: (err) => {
              setStep("idle");
              reject(err);
            },
          }
        );
      });
    },
    [address, publicClient, writeContract]
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
            gas: BigInt(800000), // Redeem is complex: withdraws from 1-2 protocols + burn + transfer
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
