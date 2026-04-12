/**
 * Redeploy VaultManager with correct MockDAI address
 * Run: npx hardhat run scripts/redeploy-vault-correct-dai.ts --network baseSepolia
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

async function waitForHash(hash: `0x${string}`) {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
}

async function main() {
  const { viem } = await network.connect();
  const privateKey = requireEnv("PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Load existing deployment
  const deploymentPath = join(process.cwd(), "deployments", "base-sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("No existing deployment found.");
  }

  const existingDeployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const strategyRouter = existingDeployment.addresses.strategyRouter;
  const riskRegistry = existingDeployment.addresses.riskRegistry;
  const treasuryAddress = existingDeployment.addresses.treasuryAddress || existingDeployment.treasuryAddress;
  const usdc = existingDeployment.addresses.usdc as Address;
  const swapRouter = existingDeployment.addresses.swapRouter as Address;
  const usdt = existingDeployment.addresses.usdt as Address;
  const mockDai = "0x89d50c47066b207d68a1a0decff41ebbdda441a2" as Address; // Correct MockDAI address

  console.log("Redeploying VaultManager with correct MockDAI address...");
  console.log(`Deployer: ${account.address}`);
  console.log(`Old VaultManager: ${existingDeployment.addresses.vaultManager}`);
  console.log(`Mock DAI Address: ${mockDai}`);

  // Deploy new VaultManager with correct DAI
  console.log("\nDeploying new VaultManager...");
  const newVaultManager = await viem.deployContract("VaultManager", [
    usdc,
    "VaultMind USDC Vault",
    "vUSDC",
    riskRegistry,
    account.address,
    swapRouter,
    usdt,
    mockDai // Using MockDAI where tokens actually exist
  ]);
  console.log(`✅ New VaultManager: ${newVaultManager.address}`);

  // Deploy new FeeCollector
  console.log("Deploying FeeCollector...");
  const feeCollector = await viem.deployContract("FeeCollector", [
    usdc,
    newVaultManager.address,
    treasuryAddress,
    account.address
  ]);
  console.log(`✅ FeeCollector: ${feeCollector.address}`);

  // Setup contracts
  console.log("\nSetting up contracts...");
  const setupAbi = [
    {
      name: "setStrategyRouter",
      type: "function",
      stateMutability: "nonpayable" as const,
      inputs: [{ name: "strategyRouter_", type: "address" }],
      outputs: []
    }
  ] as const;

  const walletClient = await viem.getWalletClient();
  const publicClient = await viem.getPublicClient();

  const tx1 = await walletClient.writeContract({
    address: newVaultManager.address as Address,
    abi: setupAbi,
    functionName: "setStrategyRouter",
    args: [strategyRouter as Address],
    account
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });

  const tx2 = await walletClient.writeContract({
    address: newVaultManager.address as Address,
    abi: [
      {
        name: "setFeeCollector",
        type: "function",
        stateMutability: "nonpayable" as const,
        inputs: [{ name: "feeCollector_", type: "address" }],
        outputs: []
      }
    ] as const,
    functionName: "setFeeCollector",
    args: [feeCollector.address as Address],
    account
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });

  // Update deployment file
  const updatedDeployment = {
    ...existingDeployment,
    addresses: {
      ...existingDeployment.addresses,
      vaultManager: newVaultManager.address,
      feeCollector: feeCollector.address,
      dai: mockDai
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("REDEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nNew VaultManager:  ${newVaultManager.address}`);
  console.log(`New FeeCollector:  ${feeCollector.address}`);
  console.log(`Using MockDAI:     ${mockDai}`);
  console.log("\n✅ Update frontend with:");
  console.log(`   vaultManager: '${newVaultManager.address}' as const,`);
  console.log(`   feeCollector: '${feeCollector.address}' as const,`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
