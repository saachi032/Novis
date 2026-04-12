import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

async function testVaultState() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const deployments = JSON.parse(readFileSync(join(process.cwd(), "deployments/base-sepolia.json"), "utf-8"));
  const { vaultManager: vaultAddr, dai } = deployments.addresses;

  console.log("Testing vault state...");

  // Try to read totalSupply
  const vaultABI = [
    {
      type: "function",
      name: "totalSupply",
      stateMutability: "view",
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "totalAssets",
      stateMutability: "view",
      outputs: [{ name: "", type: "uint256" }]
    },
    {
      type: "function",
      name: "asset",
      stateMutability: "view",
      outputs: [{ name: "", type: "address" }]
    }
  ] as const;

  try {
    const ts = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "totalSupply",
    }) as bigint;
    console.log("totalSupply():", ts.toString());
  } catch (e) {
    console.log("totalSupply() failed:", e);
  }

  try {
    const ta = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "totalAssets",
    }) as bigint;
    console.log("totalAssets():", ta.toString());
  } catch (e) {
    console.log("totalAssets() failed:", e);
  }

  try {
    const asset = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "asset",
    }) as string;
    console.log("asset():", asset);
  } catch (e) {
    console.log("asset() failed:", e);
  }
}

testVaultState().catch(console.error);
