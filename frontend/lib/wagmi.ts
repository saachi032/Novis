import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from '@wagmi/connectors';

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
  'https://sepolia.base.org';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  pollingInterval: 120_000, // 2 min global polling — prevents excessive RPC calls
  transports: {
    [baseSepolia.id]: http(rpcUrl, {
      batch: true,          // batch JSON-RPC calls to reduce request count
      retryCount: 2,
      retryDelay: 1_000,
    }),
  },
});
