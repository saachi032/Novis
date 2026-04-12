import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { parseUnits } from "viem";

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
  
  console.log("Testing USDC deposit flow...");
  console.log("User address:", wallet.account.address);
  console.log("VaultManager v3:", vaultAddr);
  
  // 1. Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("\n1. USDC balance:", Number(usdcBalance) / 1e6, "USDC");
  
  if (usdcBalance === BigInt(0)) {
    console.log("   ⚠️  No USDC balance!");
    return;
  }
  
  // 2. Approve VaultManager to spend USDC
  const approvalAmount = BigInt(100) * BigInt(10 ** 6); // 100 USDC (6 decimals)
  console.log("\n2. Approving 100 USDC to VaultManager...");
  const approveTx = await wallet.writeContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [vaultAddr, approvalAmount],
  });
  console.log("   Approval tx:", approveTx);
  
  // 3. Call deposit (ERC4626 standard)
  const vaultABI = [
    {
      type: "function",
      name: "deposit",
      stateMutability: "nonpayable",
      inputs: [
        { name: "assets", type: "uint256" },
        { name: "receiver", type: "address" }
      ]
    }
  ] as const;
  
  console.log("\n3. Calling deposit(100e6, user)...");
  const depositTx = await wallet.writeContract({
    address: vaultAddr,
    abi: vaultABI,
    functionName: "deposit",
    args: [approvalAmount, wallet.account.address],
  });
  console.log("   Deposit tx:", depositTx);
  console.log("\n✓ USDC deposit completed!");
}

main().catch(console.error);
