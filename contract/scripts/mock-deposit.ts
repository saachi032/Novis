import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { parseUnits } from "viem";

type Deployment = {
  addresses: {
    riskRegistry: `0x${string}`;
    vaultManager: `0x${string}`;
    usdc: `0x${string}`;
  };
};

const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
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

function loadDeployment(): Deployment {
  const path = join(process.cwd(), "deployments", "base-sepolia.json");
  return JSON.parse(readFileSync(path, "utf8")) as Deployment;
}

async function waitForHash(hash: `0x${string}`) {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
}

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const wallet = walletClients[0];

  if (!wallet) {
    throw new Error("No wallet client available");
  }

  const deployment = loadDeployment();
  const vaultManager = await viem.getContractAt("VaultManager", deployment.addresses.vaultManager);
  const riskRegistry = await viem.getContractAt("RiskRegistry", deployment.addresses.riskRegistry);

  const amount = parseUnits("1", 6);

  const currentBalance = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address]
  });

  if (currentBalance < amount) {
    throw new Error(`Insufficient USDC for mock deposit. Balance=${currentBalance}`);
  }

  const allowance = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [wallet.account.address, deployment.addresses.vaultManager]
  });

  const strategy = await riskRegistry.read.getUserStrategy([wallet.account.address]);
  console.log(`Current strategy: riskPercentage=${strategy[0]} durationSeconds=${strategy[1]}`);

  if (allowance < amount) {
    const approveHash = await wallet.writeContract({
      address: deployment.addresses.usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [deployment.addresses.vaultManager, amount]
    });
    await waitForHash(approveHash);
    console.log(`approve tx: ${approveHash}`);
  } else {
    console.log("approve skipped: allowance already sufficient");
  }

  const depositHash = await vaultManager.write.deposit([amount, wallet.account.address]);
  await waitForHash(depositHash);
  console.log(`deposit tx: ${depositHash}`);

  const shares = await vaultManager.read.balanceOf([wallet.account.address]);
  const totalAssets = await vaultManager.read.totalAssets();

  console.log(`Updated shares: ${shares}`);
  console.log(`Vault total assets: ${totalAssets}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
