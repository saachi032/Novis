import type { PublicClient } from "viem";
import { BASE_SEPOLIA_DEPLOYMENT, DEPLOYMENT_BLOCK as FALLBACK_BLOCK } from "@/lib/contracts";

const deploymentBlockCache = new Map<string, bigint>();

/**
 * Resolve the block where a contract was first deployed (binary search on bytecode).
 * Cached per address so history scans start at the correct block.
 */
export async function resolveContractDeploymentBlock(
  publicClient: PublicClient,
  address: `0x${string}`
): Promise<bigint> {
  const key = address.toLowerCase();
  const cached = deploymentBlockCache.get(key);
  if (cached !== undefined) return cached;

  const envBlock = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK;
  if (envBlock && /^\d+$/.test(envBlock)) {
    const parsed = BigInt(envBlock);
    deploymentBlockCache.set(key, parsed);
    return parsed;
  }

  try {
    const latest = await publicClient.getBlockNumber();
    let lo = 0n;
    let hi = latest;
    let deployBlock = latest;

    while (lo <= hi) {
      const mid = (lo + hi) / 2n;
      const code = await publicClient.getBytecode({ address, blockNumber: mid });
      if (code && code !== "0x") {
        deployBlock = mid;
        if (mid === 0n) break;
        hi = mid - 1n;
      } else {
        lo = mid + 1n;
      }
    }

    deploymentBlockCache.set(key, deployBlock);
    return deployBlock;
  } catch {
    deploymentBlockCache.set(key, FALLBACK_BLOCK);
    return FALLBACK_BLOCK;
  }
}

/**
 * Earliest block to scan for vault history (current + optional legacy vaults).
 */
export async function resolveHistoryStartBlock(
  publicClient: PublicClient
): Promise<bigint> {
  const vaults: `0x${string}`[] = [
    BASE_SEPOLIA_DEPLOYMENT.vaultManager,
    ...getLegacyVaultManagers(),
  ];

  let earliest = FALLBACK_BLOCK;
  for (const vault of vaults) {
    const block = await resolveContractDeploymentBlock(publicClient, vault);
    if (block < earliest) earliest = block;
  }
  return earliest;
}

export function getLegacyVaultManagers(): `0x${string}`[] {
  const raw = process.env.NEXT_PUBLIC_LEGACY_VAULT_MANAGERS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s))
    .map((s) => s as `0x${string}`);
}
