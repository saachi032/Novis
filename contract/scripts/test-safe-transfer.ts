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

  const dai = "0x89d50c47066b207d68a1a0decff41ebbdda441a2";
  const testTransferAddr = "0x1e911dc0e49d8d647d5691ae9d631c92183fa6b7";
  
  const testABI = [
    {
      type: "function",
      name: "testSafeTransfer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenIn", type: "address" },
        { name: "amountIn", type: "uint256" }
      ]
    }
  ] as const;

  console.log("Testing safeTransferFrom with TestTransfer...");
  
  // Check balance
  const balance = await publicClient.readContract({
    address: dai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("DAI balance:", Number(balance) / 1e18, "DAI");
  
  // Approve
  const amount = BigInt(50) * BigInt(10 ** 18);
  console.log("Approving 50 DAI...");
  await wallet.writeContract({
    address: dai,
    abi: erc20Abi,
    functionName: "approve",
    args: [testTransferAddr, amount],
  });
  
  // Call testSafeTransfer
  console.log("Calling testSafeTransfer...");
  const tx = await wallet.writeContract({
    address: testTransferAddr,
    abi: testABI,
    functionName: "testSafeTransfer",
    args: [dai, amount],
  });
  console.log("✓ Success! Tx:", tx);
}

main().catch(console.error);
