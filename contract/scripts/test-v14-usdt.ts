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
  const { usdt, usdc, vaultManager: vaultAddr } = deployments.addresses;
  
  const vaultABI = [
    {
      type: "function",
      name: "depositAnyStablecoin",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenIn", type: "address" },
        { name: "amountIn", type: "uint256" }
      ]
    },
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }]
    }
  ] as const;

  console.log("=== Testing USDT Deposit on v14 ===");
  console.log("VaultManager:", vaultAddr);
  console.log("User:", wallet.account.address);
  
  // Check USDT balance
  const usdtBalance = await publicClient.readContract({
    address: usdt,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("\nUSDT balance:", Number(usdtBalance) / 1e6, "USDT");
  
  if (usdtBalance > 0) {
    const amount = BigInt(100) * BigInt(10 ** 6); // 100 USDT
    console.log("\n1. Approving 100 USDT...");
    const approveTx = await wallet.writeContract({
      address: usdt,
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddr, amount],
    });
    console.log("   Approval tx:", approveTx);
    
    console.log("\n2. Calling depositAnyStablecoin(usdt, 100e6)...");
    const depositTx = await wallet.writeContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "depositAnyStablecoin",
      args: [usdt, amount],
    });
    console.log("   ✓ Deposit tx:", depositTx);
    
    const shares = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "balanceOf",
      args: [wallet.account.address],
    }) as bigint;
    console.log("   Shares earned:", Number(shares) / 1e18);
    
    console.log("\n✅ USDT deposit successful!");
  } else {
    console.log("⚠️  No USDT balance!");
  }
}

main().catch(console.error);
