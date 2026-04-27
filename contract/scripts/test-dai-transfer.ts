import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const wallet = walletClients[0];

  if (!wallet) {
    throw new Error("No wallet client available");
  }

  const deployments = JSON.parse(readFileSync(join(process.cwd(), "deployments/base-sepolia.json"), "utf-8"));
  const { dai } = deployments.addresses;
  
  console.log("Testing DAI transfer (no contract)...");
  console.log("User address:", wallet.account.address);
  console.log("DAI contract:", dai);
  console.log("Destination:", "0x0000000000000000000000000000000000000001");
  
  // 1. Check DAI balance
  const daiBalance = await publicClient.readContract({
    address: dai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("\n1. DAI balance:", Number(daiBalance) / 1e18, "DAI");
  
  // 2. Direct transfer (not approve + transferFrom)
  const transferAmount = BigInt(1) * BigInt(10 ** 18); // 1 DAI
  console.log("\n2. Calling transfer(0x0000...0001, 1 DAI)...");
  try {
    const transferTx = await wallet.writeContract({
      address: dai,
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x0000000000000000000000000000000000000001", transferAmount],
    });
    console.log("   Transfer tx:", transferTx);
    console.log("✓ Transfer succeeded!");
  } catch (error) {
    console.log("   Transfer failed:", error);
  }
}

main().catch(console.error);
