import { createWalletClient, createPublicClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

// Minimal ABI just for the setVault function
const strategyRouterAbi = [
  {
    inputs: [{ internalType: "address", name: "vault_", type: "address" }],
    name: "setVault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "vault",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  }
];

async function main() {
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  if (!pk) throw new Error("Missing PRIVATE_KEY in .env");

  const account = privateKeyToAccount(pk);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  });

  const strategyRouterAddress = "0xa75a715818Aef85C3A5850cdF70c82C30c2487CD";
  const newVaultManagerAddress = "0x1694d4451cf9463F998773c343d42342445F43EC";

  console.log("Connecting to StrategyRouter at", strategyRouterAddress);
  console.log("Using account:", account.address);
  
  const strategyRouter = getContract({
    address: strategyRouterAddress,
    abi: strategyRouterAbi,
    client: { public: publicClient, wallet: walletClient },
  });
  
  console.log("Setting new VaultManager address to:", newVaultManagerAddress);
  
  const { request } = await publicClient.simulateContract({
    account,
    address: strategyRouterAddress,
    abi: strategyRouterAbi,
    functionName: "setVault",
    args: [newVaultManagerAddress],
  });
  
  const tx = await walletClient.writeContract(request);
  
  console.log("Transaction sent! Hash:", tx);
  console.log("Waiting for confirmation...");
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  
  const currentVault = await strategyRouter.read.vault();
  console.log("Verified new vault address:", currentVault);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
