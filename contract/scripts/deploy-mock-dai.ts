/**
 * Deploy Mock DAI token to Base Sepolia
 * Run: npx hardhat run scripts/deploy-mock-dai.ts --network baseSepolia
 */

import "dotenv/config";
import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";

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

  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const initialOwner = optionalAddress("INITIAL_OWNER_ADDRESS", deployerAccount.address);

  console.log("Deploying Mock DAI to Base Sepolia");
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Deployer: ${deployerAccount.address}`);
  console.log(`Initial owner: ${initialOwner}`);

  // Deploy MockDAI
  const mockDai = await viem.deployContract("MockDAI", [initialOwner]);
  console.log(`\n✅ MockDAI deployed: ${mockDai.address}`);

  // Mint some tokens to deployer for testing
  console.log("\nMinting test tokens...");
  const deployerBalance = BigInt("1000") * BigInt(10) ** BigInt(18); // 1000 DAI
  const txHash = await mockDai.write.mint([deployerAccount.address, deployerBalance]);
  await waitForHash(txHash as `0x${string}`);
  console.log(`✅ Minted ${1000} DAI to deployer`);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`\nMockDAI Address: ${mockDai.address}`);
  console.log(`Deployer Balance: 1000 DAI`);
  console.log("\nTo use in frontend, update:");
  console.log("  frontend/lib/constants/stablecoins.ts");
  console.log(`  Replace DAI address with: ${mockDai.address.toLowerCase()}`);
  console.log("\nTo mint more tokens:");
  console.log("  await mockDai.write.mint([yourAddress, BigInt('1000') * BigInt(10) ** BigInt(18)])");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
