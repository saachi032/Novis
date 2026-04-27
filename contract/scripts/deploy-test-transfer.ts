import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const { viem } = await network.connect();
  const privateKey = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);

  console.log("Deploying TestTransfer contract...");
  const testTransfer = await viem.deployContract("TestTransfer", []);
  console.log("✓ TestTransfer deployed at:", testTransfer.address);
}

main().catch(console.error);
