"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletDisplayNameProvider } from "@/components/wallet/WalletDisplayNameContext";
import { StablecoinProvider } from "@/lib/context/StablecoinContext";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

import "@rainbow-me/rainbowkit/styles.css";

const rkLight = lightTheme({
  accentColor: "#557571",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
});

const rkDark = darkTheme({
  accentColor: "#557571",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
});

function RainbowKitThemed({ children }: { children: ReactNode }) {
  const { theme, mounted } = useTheme();
  const rk = mounted && theme === "dark" ? rkDark : rkLight;
  return <RainbowKitProvider theme={rk}>{children}</RainbowKitProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RainbowKitThemed>
            <WalletDisplayNameProvider>
              <StablecoinProvider>{children}</StablecoinProvider>
            </WalletDisplayNameProvider>
          </RainbowKitThemed>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
