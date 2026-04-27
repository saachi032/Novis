import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { getAddress } from "viem";

/** Base mainnet — USDC, USDT, DAI, and Uniswap V3 SwapRouter02 */
export const BASE_MAINNET_STABLECOINS = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  dai: "0x50c5725949A6f0c72E6C4a641F24049A917DB0Cb",
  uniswapV3SwapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
} as const;

/**
 * Primary USDT on Base Sepolia used by this deployment/wallet flow.
 * Keep older test deployments in the alternates list so the UI can still surface balances.
 */
export const BASE_SEPOLIA_USDT_PRIMARY =
  "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a" as const;

/** Legacy / alternate USDT test deployments — UI sums balances with the primary */
export const BASE_SEPOLIA_USDT_BALANCE_ALTERNATES = [
  "0xd7e9c75c6c05fde929cac19bb887892de78819b7",
  "0x826cc8c4cb5e2eedfe46281626f3997416666e7e",
] as const;

function sepoliaUsdtAddressForTx(): `0x${string}` {
  const env = process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDT;
  if (
    typeof env === "string" &&
    env.startsWith("0x") &&
    env.length === 42
  ) {
    try {
      return getAddress(env) as `0x${string}`;
    } catch {
      /* fall through */
    }
  }
  return getAddress(BASE_SEPOLIA_USDT_PRIMARY) as `0x${string}`;
}

/**
 * Base Sepolia test tokens (must match VaultManager constructor `usdt` / `dai` for zaps).
 */
export const BASE_SEPOLIA_STABLECOINS = {
  usdc: BASE_SEPOLIA_ADDRESSES.usdc,
  get usdt() {
    return sepoliaUsdtAddressForTx();
  },
  dai: "0x89d50c47066b207d68a1a0decff41ebbdda441a2", // MockDAI - where your 1000 DAI was minted
} as const;

export type StablecoinId = "USDC" | "USDT" | "DAI";

export type StablecoinOption = {
  id: StablecoinId;
  label: string;
  address: `0x${string}`;
  decimals: number;
};

const MAINNET_OPTIONS: StablecoinOption[] = [
  {
    id: "USDC",
    label: "USDC",
    address: BASE_MAINNET_STABLECOINS.usdc as `0x${string}`,
    decimals: 6,
  },
  {
    id: "USDT",
    label: "USDT",
    address: BASE_MAINNET_STABLECOINS.usdt as `0x${string}`,
    decimals: 6,
  },
  {
    id: "DAI",
    label: "DAI",
    address: BASE_MAINNET_STABLECOINS.dai as `0x${string}`,
    decimals: 18,
  },
];

export function getStablecoinOptions(chainId: number): StablecoinOption[] | null {
  if (chainId === 84532) {
    return [
      {
        id: "USDC",
        label: "USDC",
        address: BASE_SEPOLIA_ADDRESSES.usdc,
        decimals: 6,
      },
      {
        id: "USDT",
        label: "USDT",
        address: sepoliaUsdtAddressForTx(),
        decimals: 6,
      },
      {
        id: "DAI",
        label: "DAI",
        address: BASE_SEPOLIA_STABLECOINS.dai as `0x${string}`,
        decimals: 18,
      },
    ];
  }
  if (chainId === 8453) return MAINNET_OPTIONS;
  return null;
}

export function getStablecoinMeta(
  chainId: number,
  id: StablecoinId
): StablecoinOption | undefined {
  return getStablecoinOptions(chainId)?.find((o) => o.id === id);
}
