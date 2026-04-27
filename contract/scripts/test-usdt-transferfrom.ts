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
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
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

  const usdt = "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a";
  const testAddr = "0x1e911dc0e49d8d647d5691ae9d631c92183fa6b7";
  
  console.log("Testing USDT transferFrom...");
  
  // Check balance
  const balance = await publicClient.readContract({
    address: usdt,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address],
  }) as bigint;
  console.log("USDT balance:", Number(balance) / 1e6, "USDT");
  
  if (balance === BigInt(0)) {
    console.log("No USDT balance!");
    return;
  }
  
  // Approve
  const amount = BigInt(10) * BigInt(10 ** 6);
  console.log("Approving 10 USDT...");
  await wallet.writeContract({
    address: usdt,
    abi: erc20Abi,
    functionName: "approve",
    args: [testAddr, amount],
  });
  
  // Call transferFrom directly
  console.log("Calling transferFrom...");
  const tx = await wallet.writeContract({
    address: usdt,
    abi: erc20Abi,
    functionName: "transferFrom",
    args: [wallet.account.address, testAddr, amount],
  });
  console.log("✓ USDT transferFrom succeeded! Tx:", tx);
}

main().catch(console.error);
