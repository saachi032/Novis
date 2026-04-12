/**
 * Helper script to add swap router support for USDT/DAI deposits.
 * 
 * Since VaultManager's swapRouter, usdt, and dai are immutable,
 * you need to redeploy VaultManager with these addresses.
 * 
 * Run: npx hardhat run scripts/redeploy-vault-with-zapper.ts --network baseSepolia
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "node:fs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalAddress(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
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
  const rpcUrl = requireEnv("BASE_SEPOLIA_RPC_URL");
  const usdcAddress = getAddress(requireEnv("USDC_ADDRESS"));

  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const initialOwner = getAddress(
    optionalAddress("INITIAL_OWNER_ADDRESS", deployerAccount.address)
  );

  // Load existing deployment
  const deploymentPath = join(process.cwd(), "deployments", "base-sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("No existing deployment found. Run deploy.ts first.");
  }

  const existingDeployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const strategyRouter = existingDeployment.addresses.strategyRouter;
  const riskRegistry = existingDeployment.addresses.riskRegistry;
  const treasuryAddress = existingDeployment.treasuryAddress;
  const keeperAddress = existingDeployment.keeperAddress;

  console.log("Redeploying VaultManager with swap router support...");
  console.log(`Deployer: ${deployerAccount.address}`);
  console.log(`Initial owner: ${initialOwner}`);

  // Deploy SimpleSwapRouter if not already deployed
  let swapRouter = existingDeployment.addresses.swapRouter;
  if (!swapRouter || swapRouter === "0x0000000000000000000000000000000000000000") {
    console.log("Deploying SimpleSwapRouter...");
    const swapRouterContract = await viem.deployContract("SimpleSwapRouter", []);
    swapRouter = swapRouterContract.address;
    console.log(`SimpleSwapRouter: ${swapRouter}`);
  } else {
    console.log(`Using existing SimpleSwapRouter: ${swapRouter}`);
  }

  // Get stablecoin addresses
  const usdtAddress = getAddress(
    optionalAddress("USDT_ADDRESS", "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a")
  );
  const daiAddress = getAddress(
    optionalAddress("DAI_ADDRESS", "0xEfaD718634B87C59fdc9eAb27F0AF0543c939dA5")
  );

  // Deploy new VaultManager with swap router support
  console.log("Deploying new VaultManager with swap router...");
  const newVaultManager = await viem.deployContract("VaultManager", [
    usdcAddress,
    "VaultMind USDC Vault",
    "vUSDC",
    riskRegistry,
    initialOwner,
    swapRouter,
    usdtAddress,
    daiAddress
  ]);
  console.log(`New VaultManager: ${newVaultManager.address}`);

  // Deploy FeeCollector for new vault
  console.log("Deploying FeeCollector...");
  const feeCollector = await viem.deployContract("FeeCollector", [
    usdcAddress,
    newVaultManager.address,
    treasuryAddress,
    initialOwner
  ]);
  console.log(`FeeCollector: ${feeCollector.address}`);

  // Setup contracts
  console.log("Setting up contracts...");
  await waitForHash(
    await newVaultManager.write.setStrategyRouter([strategyRouter])
  );
  await waitForHash(
    await newVaultManager.write.setFeeCollector([feeCollector.address])
  );

  // Update deployment file
  const updatedDeployment = {
    ...existingDeployment,
    addresses: {
      ...existingDeployment.addresses,
      vaultManager: newVaultManager.address,
      feeCollector: feeCollector.address,
      swapRouter: swapRouter,
      usdt: usdtAddress,
      dai: daiAddress
    },
    notes: {
      oldVaultManager: existingDeployment.addresses.vaultManager,
      message: "Old VaultManager should be migrated/replaced with new one that supports USDT/DAI zapping"
    }
  };

  const outputDir = join(process.cwd(), "deployments");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));

  console.log("\n✅ Redeployment complete!");
  console.log(`Updated deployment saved to ${deploymentPath}`);
  console.log("\nIMPORTANT: Update frontend contracts.ts with new addresses:");
  console.log(`  vaultManager: '${newVaultManager.address}' as const,`);
  console.log(`  feeCollector: '${feeCollector.address}' as const,`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
