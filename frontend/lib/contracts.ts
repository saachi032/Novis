// Network: Base Sepolia
// Contract Addresses from the current deployment snapshot.
// USDC deposits are the live flow. `depositAnyStablecoin` remains a legacy alias in the ABI.
export const BASE_SEPOLIA_ADDRESSES = {
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
  usdt: '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a' as const,
  dai: '0x89d50c47066b207d68a1a0decff41ebbdda441a2' as const,
  mockDai: '0x89d50c47066b207d68a1a0decff41ebbdda441a2' as const,
  vaultManager: '0x2df15b2cde939d31b62136fe1fe8ee595a2c357b' as const,
  strategyRouter: '0xa75a715818aef85c3a5850cdf70c82c30c2487cd' as const,
  riskRegistry: '0x745936b6ec8e9037c042623029cd473b7ae01144' as const,
  feeCollector: '0xe885263cb6cd46632da046bb5a293aa3a630be4a' as const,
  aavePool: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27' as const,
  compoundComet: '0xc3d688b66703497DAa19211E0b686300185341f5' as const,
  swapRouter: '0x5969f3cfc1ffdfa22c779807aaf32033603f8be7' as const,
} as const;

export const BASE_MAINNET_ADDRESSES = {
  vaultManager: "0x0000000000000000000000000000000000000000" as const,
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
} as const;

export function getVaultManagerAddress(chainId: number): `0x${string}` | null {
  if (chainId === 84532) return BASE_SEPOLIA_ADDRESSES.vaultManager;
  if (chainId === 8453) return BASE_MAINNET_ADDRESSES.vaultManager;
  return null;
}

export const CHAIN_ID = 84532; // Base Sepolia chain ID
export const RPC_URL = 'https://sepolia.base.org';

// Account Roles
export const ACCOUNT_ROLES = {
  owner: '0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a' as const,
  keeper: '0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a' as const,
  treasury: '0x73Fa5dBc79e5e9c46C2ce74763F697B6b7C8fD7a' as const,
} as const;

// Legacy ABI exports for backward compatibility
export const vaultABI = [
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "withdraw",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const strategyABI = [
  {
    inputs: [],
    name: "getCurrentBlendedAPY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllocation",
    outputs: [
      { name: "aavePercent", type: "uint256" },
      { name: "compoundPercent", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
