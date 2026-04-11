import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

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

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const wallet = walletClients[0];

  if (!wallet) {
    throw new Error("No wallet client available");
  }

  const deployment = loadDeployment();
  const riskRegistry = await viem.getContractAt("RiskRegistry", deployment.addresses.riskRegistry);
  const strategyRouter = await viem.getContractAt("StrategyRouter", deployment.addresses.strategyRouter);
  const vaultManager = await viem.getContractAt("VaultManager", deployment.addresses.vaultManager);

  const allowance = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [wallet.account.address, deployment.addresses.vaultManager]
  });

  const userBalance = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet.account.address]
  });

  const vaultUsdc = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [deployment.addresses.vaultManager]
  });

  const routerUsdc = await publicClient.readContract({
    address: deployment.addresses.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [deployment.addresses.strategyRouter]
  });

  console.log(`wallet=${wallet.account.address}`);
  console.log(`allowance=${allowance}`);
  console.log(`userBalance=${userBalance}`);
  console.log(`vaultUsdc=${vaultUsdc}`);
  console.log(`routerUsdc=${routerUsdc}`);
  console.log(`hasStrategy=${await riskRegistry.read.hasStrategy([wallet.account.address])}`);
  const userStrategy = await riskRegistry.read.getUserStrategy([wallet.account.address]);
  console.log(`userStrategy=[${userStrategy[0].toString()}, ${userStrategy[1].toString()}]`);
  console.log(`vault.strategyRouter=${await vaultManager.read.strategyRouter()}`);
  console.log(`vault.feeCollector=${await vaultManager.read.feeCollector()}`);
  console.log(`router.vault=${await strategyRouter.read.vault()}`);
  console.log(`router.keeper=${await strategyRouter.read.keeper()}`);
  console.log(`router.demoMode=${await strategyRouter.read.demoMode()}`);
  console.log(`vault.paused=${await vaultManager.read.paused()}`);
  console.log(`maxDeposit=${await vaultManager.read.maxDeposit([wallet.account.address])}`);
  console.log(`aaveAPY=${await strategyRouter.read.getAaveAPY()}`);
  console.log(`compoundAPY=${await strategyRouter.read.getCompoundAPY()}`);
  const apys = await strategyRouter.read.getCurrentAPYs();
  console.log(`currentAPYs=[${apys[0].toString()}, ${apys[1].toString()}]`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
