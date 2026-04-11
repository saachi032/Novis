import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type RiskConfig = {
  key: "conservative" | "balanced" | "aggressive";
  label: string;
  level: number;
  vaultName: string;
  vaultSymbol: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalAddress(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

async function waitForHash(publicClient: Awaited<ReturnType<typeof getPublicClient>>, hash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash });
}

async function getPublicClient() {
  const { viem } = await network.connect();
  return viem.getPublicClient();
}

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const privateKey = requireEnv("PRIVATE_KEY");
  const rpcUrl = requireEnv("BASE_SEPOLIA_RPC_URL");
  const usdcAddress = getAddress(requireEnv("USDC_ADDRESS"));
  const aavePoolAddress = getAddress(requireEnv("AAVE_POOL_ADDRESS"));
  const compoundCometAddress = getAddress(requireEnv("COMPOUND_COMET_ADDRESS"));

  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const initialOwner = getAddress(optionalAddress("INITIAL_OWNER_ADDRESS", deployerAccount.address));
  const treasuryAddress = getAddress(optionalAddress("TREASURY_ADDRESS", initialOwner));

  const riskConfigs: RiskConfig[] = [
    {
      key: "conservative",
      label: "Conservative",
      level: 0,
      vaultName: process.env.CONSERVATIVE_VAULT_NAME?.trim() || "Yield Optimizer Conservative Vault",
      vaultSymbol: process.env.CONSERVATIVE_VAULT_SYMBOL?.trim() || "yoUSDC-C"
    },
    {
      key: "balanced",
      label: "Balanced",
      level: 1,
      vaultName: process.env.BALANCED_VAULT_NAME?.trim() || "Yield Optimizer Balanced Vault",
      vaultSymbol: process.env.BALANCED_VAULT_SYMBOL?.trim() || "yoUSDC-B"
    },
    {
      key: "aggressive",
      label: "Aggressive",
      level: 2,
      vaultName: process.env.AGGRESSIVE_VAULT_NAME?.trim() || "Yield Optimizer Aggressive Vault",
      vaultSymbol: process.env.AGGRESSIVE_VAULT_SYMBOL?.trim() || "yoUSDC-A"
    }
  ];

  console.log("Deploying to Base Sepolia");
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Deployer: ${deployerAccount.address}`);
  console.log(`Initial owner: ${initialOwner}`);
  console.log(`Treasury: ${treasuryAddress}`);

  const riskRegistry = await viem.deployContract("RiskRegistry", [initialOwner]);
  console.log(`RiskRegistry: ${riskRegistry.address}`);

  const profiles: Record<string, Record<string, `0x${string}`>> = {};

  for (const config of riskConfigs) {
    console.log(`Deploying ${config.label} profile`);

    const strategyRouter = await viem.deployContract("StrategyRouter", [
      usdcAddress,
      aavePoolAddress,
      compoundCometAddress,
      config.level,
      initialOwner
    ]);
    console.log(`${config.label} StrategyRouter: ${strategyRouter.address}`);

    const vaultManager = await viem.deployContract("VaultManager", [
      usdcAddress,
      config.vaultName,
      config.vaultSymbol,
      riskRegistry.address,
      config.level,
      initialOwner
    ]);
    console.log(`${config.label} VaultManager: ${vaultManager.address}`);

    const feeCollector = await viem.deployContract("FeeCollector", [
      usdcAddress,
      vaultManager.address,
      treasuryAddress,
      initialOwner
    ]);
    console.log(`${config.label} FeeCollector: ${feeCollector.address}`);

    const rebalanceExecutor = await viem.deployContract("RebalanceExecutor", [
      strategyRouter.address,
      initialOwner
    ]);
    console.log(`${config.label} RebalanceExecutor: ${rebalanceExecutor.address}`);

    await waitForHash(publicClient, await vaultManager.write.setStrategyRouter([strategyRouter.address]));
    await waitForHash(publicClient, await vaultManager.write.setFeeCollector([feeCollector.address]));
    await waitForHash(publicClient, await strategyRouter.write.setVault([vaultManager.address]));
    await waitForHash(publicClient, await strategyRouter.write.setRebalanceOperator([rebalanceExecutor.address]));

    profiles[config.key] = {
      strategyRouter: strategyRouter.address,
      vaultManager: vaultManager.address,
      feeCollector: feeCollector.address,
      rebalanceExecutor: rebalanceExecutor.address
    };
  }

  const deployment = {
    network: "baseSepolia",
    deployer: deployerAccount.address,
    initialOwner,
    treasuryAddress,
    addresses: {
      usdc: usdcAddress,
      aavePool: aavePoolAddress,
      compoundComet: compoundCometAddress,
      riskRegistry: riskRegistry.address
    },
    profiles
  };

  const outputDir = join(process.cwd(), "deployments");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "base-sepolia.json");
  writeFileSync(outputPath, JSON.stringify(deployment, null, 2));

  console.log("Deployment complete");
  console.log(`Saved deployment to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
