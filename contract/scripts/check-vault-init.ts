import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const deployments = JSON.parse(readFileSync(join(process.cwd(), "deployments/base-sepolia.json"), "utf-8"));
  const { vaultManager: vaultAddr, dai, usdt, usdc } = deployments.addresses;
  
  console.log("Checking VaultManager initialization...");
  console.log("VaultManager:", vaultAddr);
  console.log("");
  console.log("Expected addresses from config:");
  console.log("  USDC (asset):", usdc);
  console.log("  USDT:", usdt);
  console.log("  DAI:", dai);
  
  // Check contract storage (read public immutable variables)
  const vaultABI = [
    {
      type: "function",
      name: "usdt",
      stateMutability: "view",
      outputs: [{ name: "", type: "address" }]
    },
    {
      type: "function",
      name: "dai",
      stateMutability: "view",
      outputs: [{ name: "", type: "address" }]
    },
    {
      type: "function",
      name: "asset",
      stateMutability: "view",
      outputs: [{ name: "", type: "address" }]
    }
  ] as const;
  
  try {
    const usdtAddr = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "usdt",
    }) as string;
    console.log("\nActual contract values:");
    console.log("  usdt ():", usdtAddr);
    console.log("  Match:", usdtAddr.toLowerCase() === usdt.toLowerCase() ? "✓" : "✗");
  } catch (e) {
    console.log("  usdt(): Error reading -", e);
  }
  
  try {
    const daiAddr = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "dai",
    }) as string;
    console.log("  dai():", daiAddr);
    console.log("  Match:", daiAddr.toLowerCase() === dai.toLowerCase() ? "✓" : "✗");
  } catch (e) {
    console.log("  dai(): Error reading -", e);
  }
  
  try {
    const assetAddr = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "asset",
    }) as string;
    console.log("  asset():", assetAddr);
    console.log("  Match:", assetAddr.toLowerCase() === usdc.toLowerCase() ? "✓" : "✗");
  } catch (e) {
    console.log("  asset(): Error reading -", e);
  }
}

main().catch(console.error);
