import "dotenv/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatViem],
  solidity: "0.8.28",
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "generic",
    },
    ...(process.env.BASE_SEPOLIA_RPC_URL && process.env.PRIVATE_KEY
      ? {
          baseSepolia: {
            type: "http" as const,
            chainType: "op" as const,
            url: process.env.BASE_SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
          },
        }
      : {}),
  },
});
