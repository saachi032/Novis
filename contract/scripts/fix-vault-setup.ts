/**
 * Fix VaultManager setup - ensure all contract references are properly initialized
 * Run: npx hardhat run scripts/fix-vault-setup.ts --network baseSepolia
 */

import "dotenv/config";
import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "node:fs";
import { join } from "node:path";
import type { Address } from "viem";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main() {
  const { viem } = await network.connect();
  const privateKey = requireEnv("PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Load deployment
  const deploymentPath = join(process.cwd(), "deployments", "base-sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const vaultManagerAddr = deployment.addresses.vaultManager as Address;
  const strategyRouterAddr = deployment.addresses.strategyRouter as Address;
  const feeCollectorAddr = deployment.addresses.feeCollector as Address;

  console.log("Fixing VaultManager setup...");
  console.log(`VaultManager: ${vaultManagerAddr}`);
  console.log(`StrategyRouter: ${strategyRouterAddr}`);
  console.log(`FeeCollector: ${feeCollectorAddr}`);

  const walletClient = await viem.getWalletClient();
  const publicClient = await viem.getPublicClient();

  // ABI for contract calls
  const vaultAbi = [
    {
      name: "setStrategyRouter",
      type: "function",
      stateMutability: "nonpayable" as const,
      inputs: [{ name: "strategyRouter_", type: "address" }],
      outputs: []
    },
    {
      name: "setFeeCollector",
      type: "function",
      stateMutability: "nonpayable" as const,
      inputs: [{ name: "feeCollector_", type: "address" }],
      outputs: []
    }
  ] as const;

  const strategyRouterAbi = [
    {
      name: "setVault",
      type: "function",
      stateMutability: "nonpayable" as const,
      inputs: [{ name: "vault_", type: "address" }],
      outputs: []
    }
  ] as const;

  try {
    console.log("\n1. Setting StrategyRouter on VaultManager...");
    const tx1 = await walletClient.writeContract({
      address: vaultManagerAddr,
      abi: vaultAbi,
      functionName: "setStrategyRouter",
      args: [strategyRouterAddr],
      account
    });
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
    console.log("   ✅ Done: " + tx1);

    console.log("\n2. Setting FeeCollector on VaultManager...");
    const tx2 = await walletClient.writeContract({
      address: vaultManagerAddr,
      abi: vaultAbi,
      functionName: "setFeeCollector",
      args: [feeCollectorAddr],
      account
    });
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
    console.log("   ✅ Done: " + tx2);

    console.log("\n3. Setting VaultManager on StrategyRouter...");
    const tx3 = await walletClient.writeContract({
      address: strategyRouterAddr,
      abi: strategyRouterAbi,
      functionName: "setVault",
      args: [vaultManagerAddr],
      account
    });
    await publicClient.waitForTransactionReceipt({ hash: tx3 });
    console.log("   ✅ Done: " + tx3);

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL SETUP COMPLETE");
    console.log("=".repeat(60));
    console.log("\nVaultManager is now fully configured!");
    console.log("Deposits should now work correctly.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  }
}

main().catch(console.error);
