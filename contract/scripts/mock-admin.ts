import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type Deployment = {
  addresses: {
    feeCollector: `0x${string}`;
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
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY");
  }

  const owner = privateKeyToAccount(privateKey as `0x${string}`);
  const feeCollector = await viem.getContractAt("FeeCollector", deployment.addresses.feeCollector);
  const txHash = await feeCollector.write.setTreasuryAddress([getAddress(owner.address)]);
  await waitForHash(txHash);
  console.log(`setTreasuryAddress tx: ${txHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
