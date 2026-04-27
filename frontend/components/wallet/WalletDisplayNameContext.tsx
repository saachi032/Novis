"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";
import {
  readWalletDisplayName,
  shortenAddress,
  writeWalletDisplayName,
} from "@/lib/walletDisplayName";

type WalletDisplayNameContextValue = {
  displayName: string | null;
  displayLabel: string;
  saveDisplayName: (name: string) => void;
};

const WalletDisplayNameContext =
  createContext<WalletDisplayNameContextValue | null>(null);

export function useWalletDisplayName(): WalletDisplayNameContextValue {
  const ctx = useContext(WalletDisplayNameContext);
  if (!ctx) {
    throw new Error(
      "useWalletDisplayName must be used within WalletDisplayNameProvider"
    );
  }
  return ctx;
}

export function WalletDisplayNameProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setDisplayName(null);
      return;
    }
    setDisplayName(readWalletDisplayName(address));
  }, [isConnected, address]);

  const saveDisplayName = useCallback(
    (name: string) => {
      if (!address) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      writeWalletDisplayName(address, trimmed);
      setDisplayName(trimmed);
    },
    [address]
  );

  const displayLabel = useMemo(() => {
    if (!address) return "";
    const n = displayName?.trim();
    if (n) return n;
    return shortenAddress(address);
  }, [displayName, address]);

  const value = useMemo(
    () => ({
      displayName,
      displayLabel,
      saveDisplayName,
    }),
    [displayName, displayLabel, saveDisplayName]
  );

  return (
    <WalletDisplayNameContext.Provider value={value}>
      {children}
    </WalletDisplayNameContext.Provider>
  );
}
