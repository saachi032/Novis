import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const { viem } = await network.connect();
  const privateKey = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);

  const deployments = JSON.parse(readFileSync("./deployments/base-sepolia.json", "utf-8"));
  const { usdc, dai, usdt, riskRegistry, swapRouter, strategyRouter } = deployments.addresses;

  console.log("Deploying VaultManager v3...");
  console.log("Deployer:", deployerAccount.address);
  console.log("Using addresses from deployments/base-sepolia.json");

  const vaultManager = await viem.deployContract("VaultManager", [
    getAddress(usdc),
    "DeFi Yield Vault",
    "YIELD",
    getAddress(riskRegistry),
    getAddress(deployerAccount.address),
    getAddress(swapRouter),
  ]);
  console.log("✓ VaultManager deployed at:", vaultManager.address);

  const feeCollector = await viem.deployContract("FeeCollector", [
    getAddress(usdc),
    getAddress(vaultManager.address),
    getAddress(deployerAccount.address),
    getAddress(deployerAccount.address),
  ]);
  console.log("✓ FeeCollector deployed at:", feeCollector.address);

  // Initialize VaultManager
  const tx1 = await vaultManager.write.setStrategyRouter([getAddress(strategyRouter)], {
    account: deployerAccount,
  });
  console.log("✓ setStrategyRouter tx:", tx1);

  const tx2 = await vaultManager.write.setFeeCollector([getAddress(feeCollector.address)], {
    account: deployerAccount,
  });
  console.log("✓ setFeeCollector tx:", tx2);

  // Update deployments file
  deployments.addresses.vaultManager = vaultManager.address;
  deployments.addresses.feeCollector = feeCollector.address;
  writeFileSync("./deployments/base-sepolia.json", JSON.stringify(deployments, null, 2));
  console.log("\n✓ Updated deployments/base-sepolia.json");
}

main().catch(console.error);
