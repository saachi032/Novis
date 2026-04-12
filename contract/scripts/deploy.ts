import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

async function waitForHash(hash: `0x${string}`) {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
}

async function main() {
  const { viem } = await network.connect();
  const privateKey = requireEnv("PRIVATE_KEY");
  const rpcUrl = requireEnv("BASE_SEPOLIA_RPC_URL");
  const usdcAddress = getAddress(requireEnv("USDC_ADDRESS"));
  const aavePoolAddress = getAddress(requireEnv("AAVE_POOL_ADDRESS"));
  const compoundCometAddress = getAddress(requireEnv("COMPOUND_COMET_ADDRESS"));

  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const initialOwner = getAddress(optionalAddress("INITIAL_OWNER_ADDRESS", deployerAccount.address));
  const treasuryAddress = getAddress(optionalAddress("TREASURY_ADDRESS", initialOwner));
  const keeperAddress = getAddress(optionalAddress("KEEPER_ADDRESS", initialOwner));
  const vaultName = process.env.VAULT_NAME?.trim() || "VaultMind USDC Vault";
  const vaultSymbol = process.env.VAULT_SYMBOL?.trim() || "vUSDC";

  console.log("Deploying VaultMind to Base Sepolia");
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Deployer: ${deployerAccount.address}`);
  console.log(`Initial owner: ${initialOwner}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`Keeper: ${keeperAddress}`);

  const riskRegistry = await viem.deployContract("RiskRegistry", [initialOwner]);
  console.log(`RiskRegistry: ${riskRegistry.address}`);

  const strategyRouter = await viem.deployContract("StrategyRouter", [
    usdcAddress,
    aavePoolAddress,
    compoundCometAddress,
    riskRegistry.address,
    initialOwner
  ]);
  console.log(`StrategyRouter: ${strategyRouter.address}`);

  const swapRouterAddress = getAddress(
    optionalAddress("SWAP_ROUTER_ADDRESS", "0x0000000000000000000000000000000000000000")
  );
  const usdtAddress = getAddress(optionalAddress("USDT_ADDRESS", "0x0000000000000000000000000000000000000000"));
  const daiAddress = getAddress(optionalAddress("DAI_ADDRESS", "0x0000000000000000000000000000000000000000"));

  const vaultManager = await viem.deployContract("VaultManager", [
    usdcAddress,
    vaultName,
    vaultSymbol,
    riskRegistry.address,
    initialOwner,
    swapRouterAddress,
    usdtAddress,
    daiAddress
  ]);
  console.log(`VaultManager: ${vaultManager.address}`);

  const feeCollector = await viem.deployContract("FeeCollector", [
    usdcAddress,
    vaultManager.address,
    treasuryAddress,
    initialOwner
  ]);
  console.log(`FeeCollector: ${feeCollector.address}`);

  await waitForHash(await vaultManager.write.setStrategyRouter([strategyRouter.address]));
  await waitForHash(await vaultManager.write.setFeeCollector([feeCollector.address]));
  await waitForHash(await strategyRouter.write.setVault([vaultManager.address]));
  await waitForHash(await strategyRouter.write.setKeeper([keeperAddress]));
  await waitForHash(await riskRegistry.write.setAuthorizedCaller([strategyRouter.address, true]));

  const deployment = {
    network: "baseSepolia",
    deployer: deployerAccount.address,
    initialOwner,
    treasuryAddress,
    keeperAddress,
    addresses: {
      usdc: usdcAddress,
      aavePool: aavePoolAddress,
      compoundComet: compoundCometAddress,
      riskRegistry: riskRegistry.address,
      strategyRouter: strategyRouter.address,
      vaultManager: vaultManager.address,
      feeCollector: feeCollector.address,
      swapRouter: swapRouterAddress,
      usdt: usdtAddress,
      dai: daiAddress
    }
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
