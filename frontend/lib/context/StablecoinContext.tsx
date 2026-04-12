"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StablecoinId } from "@/lib/constants/stablecoins";

type StablecoinContextValue = {
  selectedAsset: StablecoinId;
  setSelectedAsset: (id: StablecoinId) => void;
};

const StablecoinContext = createContext<StablecoinContextValue | null>(null);

export function StablecoinProvider({ children }: { children: ReactNode }) {
  const [selectedAsset, setSelectedAssetState] =
    useState<StablecoinId>("USDC");

  const setSelectedAsset = useCallback((id: StablecoinId) => {
    setSelectedAssetState(id);
  }, []);

  const value = useMemo(
    () => ({ selectedAsset, setSelectedAsset }),
    [selectedAsset, setSelectedAsset]
  );

  return (
    <StablecoinContext.Provider value={value}>
      {children}
    </StablecoinContext.Provider>
  );
}

export function useStablecoinPreference() {
  const ctx = useContext(StablecoinContext);
  if (!ctx) {
    throw new Error(
      "useStablecoinPreference must be used within StablecoinProvider"
    );
  }
  return ctx;
}

/** Safe variant for components that may render outside the provider (e.g. tests). */
export function useStablecoinPreferenceOptional() {
  return useContext(StablecoinContext);
}
