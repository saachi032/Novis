// Network: Base Sepolia
// Contract Addresses from Latest Deployment (April 12, 2026)
export const BASE_SEPOLIA_ADDRESSES = {
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
  riskRegistry: '0x745936b6ec8e9037c042623029cd473b7ae01144' as const,
  strategyRouter: '0xa75a715818aef85c3a5850cdf70c82c30c2487cd' as const,
  vaultManager: '0x1694d4451cf9463f998773c343d42342445f43ec' as const,
  feeCollector: '0x9fde5b14a0e164edb333843bf30b9f12da0f0841' as const,
  aavePool: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27' as const,
  compoundComet: '0xc3d688b66703497DAa19211E0b686300185341f5' as const,
} as const;

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
