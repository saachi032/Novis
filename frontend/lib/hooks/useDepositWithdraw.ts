import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useChainId,
  useReadContract,
} from "wagmi";
import { getVaultManagerAddress } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { USDC_ABI } from "@/lib/abis/USDC";
import { parseTokenAmount, parseUSDC } from "@/lib/utils/contractUtils";
import {
  getStablecoinMeta,
  type StablecoinId,
} from "@/lib/constants/stablecoins";

export type DepositStep =
  | "idle"
  | "approving"
  | "depositing"
  | "zapping";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Deposit USDC via ERC-4626 `deposit`, or USDT/DAI via `depositAnyStablecoin` (swap + deposit).
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

  const { data: swapRouterAddr, isPending: isSwapRouterLoading } =
    useReadContract({
      address: vaultManagerAddress ?? undefined,
      abi: VAULT_MANAGER_ABI,
      functionName: "swapRouter",
      query: { enabled: !!vaultManagerAddress },
    });

  const zapperEnabled = useMemo(() => {
    return (
      !!swapRouterAddr &&
      swapRouterAddr.toLowerCase() !== ZERO.toLowerCase()
    );
  }, [swapRouterAddr]);

  const zapperStatus = useMemo((): "loading" | "on" | "off" => {
    if (!vaultManagerAddress) return "off";
    if (isSwapRouterLoading) return "loading";
    return zapperEnabled ? "on" : "off";
  }, [vaultManagerAddress, isSwapRouterLoading, zapperEnabled]);

  const depositIntoVault = useCallback(
    async (amount: string, asset: StablecoinId) => {
      if (!address || !publicClient) {
        throw new Error("Wallet not connected");
      }
      if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
        throw new Error("Vault not configured for this network");
      }

      const meta = getStablecoinMeta(chainId, asset);
      if (!meta) {
        throw new Error("Unsupported network");
      }

      if ((asset === "USDT" || asset === "DAI") && !zapperEnabled) {
        throw new Error(
          "Zapper is not enabled on this vault. Deposit USDC or redeploy with a swap router."
        );
      }

      const parsed = parseTokenAmount(amount, meta.decimals);

      try {
        if (asset === "USDC") {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: meta.address,
            abi: USDC_ABI,
            functionName: "approve",
            args: [vaultManagerAddress, parsed],
            gas: 100_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });

          setStep("depositing");
          const depositHash = await writeContractAsync({
            address: vaultManagerAddress,
            abi: VAULT_MANAGER_ABI,
            functionName: "deposit",
            args: [parsed, address],
            gas: 800_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash: depositHash });
          setHash(depositHash);
          return depositHash;
        }

        setStep("approving");
        const approveHash = await writeContractAsync({
          address: meta.address,
          abi: USDC_ABI,
          functionName: "approve",
          args: [vaultManagerAddress, parsed],
          gas: 100_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        setStep("zapping");
        const zapHash = await writeContractAsync({
          address: vaultManagerAddress,
          abi: VAULT_MANAGER_ABI,
          functionName: "depositAnyStablecoin",
          args: [meta.address, parsed],
          gas: 1_200_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: zapHash });
        setHash(zapHash);
        return zapHash;
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
      zapperEnabled,
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
 * Hook for withdrawing (redeeming shares) from the vault
 */
export function useWithdraw() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContract, isPending } = useWriteContract();
  const [hash, setHash] = useState<string | null>(null);

  const vaultManagerAddress = getVaultManagerAddress(chainId);

  const withdraw = useCallback(
    (shares: string) => {
      return new Promise<void>((resolve, reject) => {
        if (!address) {
          reject(new Error("Wallet not connected"));
          return;
        }
        if (!vaultManagerAddress || vaultManagerAddress === ZERO) {
          reject(new Error("Vault not configured for this network"));
          return;
        }

        const parsedShares = parseUSDC(shares);

        writeContract(
          {
            address: vaultManagerAddress,
            abi: VAULT_MANAGER_ABI,
            functionName: "redeem",
            args: [parsedShares, address, address],
            gas: 800_000n,
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
    [address, chainId, vaultManagerAddress, writeContract]
  );

  return {
    withdraw,
    isLoading: isPending,
    hash,
  };
}
