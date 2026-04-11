import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { parseUnits } from "viem";

type Deployment = {
  addresses: {
    vaultManager: `0x${string}`;
  };
};

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
  const deployment = loadDeployment();
  const walletClients = await viem.getWalletClients();
  const wallet = walletClients[0];

  if (!wallet) {
    throw new Error("No wallet client available");
  }

  const vaultManager = await viem.getContractAt("VaultManager", deployment.addresses.vaultManager);
  const withdrawAmount = parseUnits("0.25", 6);
  const txHash = await vaultManager.write.withdraw([withdrawAmount, wallet.account.address, wallet.account.address]);
  await waitForHash(txHash);
  console.log(`withdraw tx: ${txHash}`);
  console.log(`remaining shares: ${await vaultManager.read.balanceOf([wallet.account.address])}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
