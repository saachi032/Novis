"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletDisplayNameProvider } from "@/components/wallet/WalletDisplayNameContext";

import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#557571",
            accentColorForeground: "#ffffff",
            borderRadius: "large",
          })}
        >
          <WalletDisplayNameProvider>{children}</WalletDisplayNameProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
