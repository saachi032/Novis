import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";

type Deployment = {
  addresses: {
    riskRegistry: `0x${string}`;
    strategyRouter: `0x${string}`;
    vaultManager: `0x${string}`;
    feeCollector: `0x${string}`;
    usdc: `0x${string}`;
  };
};

const erc20Abi = [
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
  const deployment = loadDeployment();
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY");
  }

  const user = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Using wallet: ${user.address}`);

  const riskRegistry = await viem.getContractAt("RiskRegistry", deployment.addresses.riskRegistry);
  const strategyRouter = await viem.getContractAt("StrategyRouter", deployment.addresses.strategyRouter);
  const vaultManager = await viem.getContractAt("VaultManager", deployment.addresses.vaultManager);
  const usdcBalance = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [user.address]
  });
  console.log(`Wallet USDC balance: ${usdcBalance}`);

  const strategyHash = await riskRegistry.write.setStrategy([1, 1]);
  await waitForHash(strategyHash);
  console.log(`setStrategy tx: ${strategyHash}`);

  const mockApyHash = await strategyRouter.write.setMockApys([420, 730]);
  await waitForHash(mockApyHash);
  console.log(`setMockApys tx: ${mockApyHash}`);

  const forceHash = await strategyRouter.write.forceRebalance([user.address]);
  await waitForHash(forceHash);
  console.log(`forceRebalance tx: ${forceHash}`);

  const userShares = await vaultManager.read.balanceOf([user.address]);
  const strategy = await riskRegistry.read.getUserStrategy([user.address]);

  console.log(`Vault shares: ${userShares}`);
  console.log(`Stored strategy: riskPercentage=${strategy[0]} durationSeconds=${strategy[1]}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
