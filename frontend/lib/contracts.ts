import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";

export const CHAIN_ID = 84532;

export const BASE_SEPOLIA_DEPLOYMENT = {
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`,
  usdt: (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a") as `0x${string}`,
  dai: (process.env.NEXT_PUBLIC_DAI_ADDRESS ?? "0x89d50c47066b207d68A1A0decfF41ebBDDa441A2") as `0x${string}`,
  aavePool: (process.env.NEXT_PUBLIC_AAVE_POOL ?? "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27") as `0x${string}`,
  compoundComet: (process.env.NEXT_PUBLIC_COMPOUND_COMET ?? "0xc3d688b66703497DAa19211E0b686300185341f5") as `0x${string}`,
  riskRegistry: (process.env.NEXT_PUBLIC_RISK_REGISTRY ?? "0x745936b6Ec8e9037c042623029CD473b7AE01144") as `0x${string}`,
  strategyRouter: (process.env.NEXT_PUBLIC_STRATEGY_ROUTER ?? "0xa75a715818Aef85C3A5850cdF70c82C30c2487CD") as `0x${string}`,
  vaultManager: (process.env.NEXT_PUBLIC_VAULT_MANAGER ?? "0x1694d4451cf9463F998773c343d42342445F43EC") as `0x${string}`,
  feeCollector: (process.env.NEXT_PUBLIC_FEE_COLLECTOR ?? "0x9FDE5b14a0e164edB333843Bf30b9f12DA0f0841") as `0x${string}`,
  swapRouter: (process.env.NEXT_PUBLIC_SWAP_ROUTER ?? "0x5969F3Cfc1FfdFA22c779807aaf32033603f8Be7") as `0x${string}`,
} as const;

export const BASE_SEPOLIA_ADDRESSES = BASE_SEPOLIA_DEPLOYMENT;

export const vaultABI = VAULT_MANAGER_ABI;
export const strategyABI = STRATEGY_ROUTER_ABI;

export const BASE_MAINNET_DEPLOYMENT = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  vaultManager: "0x0000000000000000000000000000000000000000" as const,
} as const;

export const ACCOUNT_ROLES = {
  owner: "0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a" as const,
  keeper: "0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a" as const,
  treasury: "0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a" as const,
} as const;

export const DEPLOYMENT_BLOCK = 42_500_000n;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ??
  "https://sepolia.base.org";

export function getVaultManagerAddress(chainId: number): `0x${string}` | null {
  if (chainId === 84532) return BASE_SEPOLIA_DEPLOYMENT.vaultManager;
  if (chainId === 8453) return BASE_MAINNET_DEPLOYMENT.vaultManager;
  return null;
}

export function getStrategyRouterAddress(chainId: number): `0x${string}` | null {
  if (chainId === 84532) return BASE_SEPOLIA_DEPLOYMENT.strategyRouter;
  return null;
}

export function getRiskRegistryAddress(chainId: number): `0x${string}` | null {
  if (chainId === 84532) return BASE_SEPOLIA_DEPLOYMENT.riskRegistry;
  return null;
}

export function getFeeCollectorAddress(chainId: number): `0x${string}` | null {
  if (chainId === 84532) return BASE_SEPOLIA_DEPLOYMENT.feeCollector;
  return null;
}
