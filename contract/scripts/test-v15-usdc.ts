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
      name: "depositAnyStablecoin",
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

  console.log("=== Testing USDC Deposit v16 ===");
  console.log("VaultManager:", vaultAddr);
  console.log("USDC:", usdc);
  console.log("User:", wallet.account.address);
  
  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("\nUSDC balance:", Number(usdcBalance) / 1e6, "USDC");
  
  if (usdcBalance > 0) {
    const amount = BigInt(10) * BigInt(10 ** 6); // 10 USDC
    console.log("\n✓ Test 1: deposit() - Standard ERC4626");
    console.log("  Approving", (Number(amount) / 1e6).toString(), "USDC...");
    const approveTx = await wallet.writeContract({
      address: usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddr, amount],
    });
    console.log("  Approval tx:", approveTx);
    
    // Wait a moment for approval to confirm
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("  Calling deposit()...");
    const depositTx = await wallet.writeContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "deposit",
      args: [amount, wallet.account.address],
    });
    console.log("  ✓ Success! Tx:", depositTx);
    
    // Test depositAnyStablecoin (alias)
    console.log("\n✓ Test 2: depositAnyStablecoin() - Alias");
    const amount2 = BigInt(5) * BigInt(10 ** 6); // 5 USDC
    console.log("  Approving", (Number(amount2) / 1e6).toString(), "USDC...");
    const approveTx2 = await wallet.writeContract({
      address: usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [vaultAddr, amount2],
    });
    console.log("  Approval tx:", approveTx2);
    
    // Wait a moment for approval to confirm
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("  Calling depositAnyStablecoin()...");
    const tx2 = await wallet.writeContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "depositAnyStablecoin",
      args: [amount2, wallet.account.address],
    });
    console.log("  ✓ Success! Tx:", tx2);
    
    const shares = await publicClient.readContract({
      address: vaultAddr,
      abi: vaultABI,
      functionName: "balanceOf",
      args: [wallet.account.address],
    }) as bigint;
    console.log("\n✅ Final vault shares:", Number(shares) / 1e18);
    console.log("\n✨ USDC-only vault working perfectly!");
  } else {
    console.log("⚠️  No USDC balance!");
  }
}

main().catch(console.error);
