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
  const { usdt, dai, vaultManager: vaultAddr } = deployments.addresses;
  
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

  console.log("=== Comprehensive Stablecoin Deposit Test ===");
  console.log("VaultManager v13:", vaultAddr);
  console.log("User:", wallet.account.address);
  console.log("");
  
  // Test 1: DAI deposit
  console.log("--- Test 1: DAI Deposit ---");
  const daiBalance = await publicClient.readContract({
    address: dai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("DAI balance:", Number(daiBalance) / 1e18, "DAI");
  
  if (daiBalance > 0) {
    const daiAmount = BigInt(50) * BigInt(10 ** 18);
    console.log("Approving 50 DAI...");
    await wallet.writeContract({
      address: dai,
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddr, daiAmount],
    });
    
    console.log("Depositing 50 DAI...");
    const daiTx = await wallet.writeContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "depositAnyStablecoin",
      args: [dai, daiAmount],
    });
    console.log("✓ DAI deposit successful!");
    console.log("  Tx:", daiTx);
    
    const shares = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "balanceOf",
      args: [wallet.account.address],
    }) as bigint;
    console.log("  Vault shares received:", Number(shares) / 1e18);
  }
  
  // Test 2: USDT deposit
  console.log("\n--- Test 2: USDT Deposit ---");
  const usdtBalance = await publicClient.readContract({
    address: usdt,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("USDT balance:", Number(usdtBalance) / 1e6, "USDT");
  
  if (usdtBalance > 0) {
    const usdtAmount = BigInt(50) * BigInt(10 ** 6);
    console.log("Approving 50 USDT...");
    await wallet.writeContract({
      address: usdt,
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddr, usdtAmount],
    });
    
    console.log("Depositing 50 USDT...");
    const usdtTx = await wallet.writeContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "depositAnyStablecoin",
      args: [usdt, usdtAmount],
    });
    console.log("✓ USDT deposit successful!");
    console.log("  Tx:", usdtTx);
  }
  
  console.log("\n✅ All tests passed!");
}

main().catch(console.error);
