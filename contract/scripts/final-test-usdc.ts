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
  const { usdc, vaultManager: vaultAddr } = deployments.addresses;
  
  const vaultABI = [
    {
      type: "function",
      name: "deposit",
      stateMutability: "nonpayable",
      inputs: [
        { name: "assets", type: "uint256" },
        { name: "receiver", type: "address" }
      ],
      outputs: [{ name: "shares", type: "uint256" }]
    },
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }]
    }
  ] as const;

  console.log("=== FINAL USDC DEPOSIT TEST ===");
  console.log("VaultManager v16:", vaultAddr);
  console.log("User:", wallet.account.address);
  
  const usdcBalance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  
  console.log("USDC balance:", Number(usdcBalance) / 1e6, "USDC\n");
  
  const amount = BigInt(15) * BigInt(10 ** 6); // 15 USDC
  console.log("1. Approving 15 USDC...");
  await wallet.writeContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [vaultAddr, amount],
  });
  console.log("   ✓ Approved");
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("2. Calling deposit(15e6, user)...");
  const tx = await wallet.writeContract({
    address: vaultAddr,
    abi: vaultABI,
    functionName: "deposit",
    args: [amount, wallet.account.address],
  });
  console.log("   ✓ Tx:", tx);
  
  const shares = await publicClient.readContract({
    address: vaultAddr,
    abi: vaultABI,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  
  console.log("\n✅ DEPOSIT SUCCESSFUL!");
  console.log("   Shares received:", Number(shares) / 1e18);
}

main().catch(console.error);
