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
  const { usdc, dai, riskRegistry, vaultManager: vaultAddr } = deployments.addresses;
  
  console.log("Testing DAI deposit flow...");
  console.log("User address:", wallet.account.address);
  console.log("VaultManager v3:", vaultAddr);
  
  // 1. Check DAI balance
  const daiBalance = await publicClient.readContract({
    address: dai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("\n1. DAI balance:", Number(daiBalance) / 1e18, "DAI");
  
  if (daiBalance === BigInt(0)) {
    console.log("   ⚠️  No DAI balance! Need to mint first.");
    return;
  }
  
  // 2. Check if user has strategy set
  const registryABI = [
    {
      type: "function",
      name: "hasStrategy",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{ name: "", type: "bool" }]
    }
  ] as const;
  
  const hasStrat = await publicClient.readContract({
    address: riskRegistry,
    abi: registryABI,
    functionName: "hasStrategy",
    args: [wallet.account.address],
  }) as boolean;
  console.log("2. Has strategy set:", hasStrat);
  
  if (!hasStrat) {
    console.log("   ⚠️  Strategy not set! Need to run that first.");
    return;
  }
  
  // 3. Approve VaultManager to spend DAI
  const approvalAmount = BigInt(100) * BigInt(10 ** 18); // 100 DAI
  console.log("\n3. Approving 100 DAI to VaultManager...");
  const approveTx = await wallet.writeContract({
    address: dai,
    abi: erc20Abi,
    functionName: "approve",
    args: [vaultAddr, approvalAmount],
  });
  console.log("   Approval tx:", approveTx);
  
  // 4. Call depositAnyStablecoin
  const vaultABI = [
    {
      type: "function",
      name: "depositAnyStablecoin",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenIn", type: "address" },
        { name: "amountIn", type: "uint256" }
      ]
    }
  ] as const;
  
  console.log("\n4. Calling depositAnyStablecoin(dai, 100e18)...");
  const depositTx = await wallet.writeContract({
    address: vaultAddr,
    abi: vaultABI,
    functionName: "depositAnyStablecoin",
    args: [dai, approvalAmount],
  });
  console.log("   Deposit tx:", depositTx);
  console.log("\n✓ DAI deposit completed!");
}

main().catch(console.error);
