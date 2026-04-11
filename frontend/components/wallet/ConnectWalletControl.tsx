"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import { useWalletDisplayName } from "@/components/wallet/WalletDisplayNameContext";
import { WalletAccountDropdown } from "@/components/wallet/WalletAccountDropdown";

type Props = {
  disconnectedLabel?: string;
  disconnectedClassName?: string;
};

export function ConnectWalletControl({
  disconnectedLabel = "Connect wallet",
  disconnectedClassName,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { displayLabel } = useWalletDisplayName();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const defaultDisconnected =
    "rounded-full border border-brand-gray bg-white px-5 py-2.5 text-sm font-semibold text-brand-black shadow-soft transition duration-300 hover:scale-105 hover:bg-brand-bg";

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === "authenticated");

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={disconnectedClassName ?? defaultDisconnected}
            >
              {disconnectedLabel}
            </button>
          );
        }

        return (
          <div ref={wrapRef} className="relative">
            <div className="flex items-center gap-2">
              {chain.iconUrl ? (
                <button
                  type="button"
                  onClick={openChainModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-gray bg-white shadow-soft transition duration-300 hover:scale-105"
                  aria-label={`Switch network: ${chain.name ?? "chain"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" src={chain.iconUrl} className="h-6 w-6" />
                </button>
              ) : null}
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
                className={`flex items-center gap-2 rounded-full border border-brand-gray bg-white py-2 pl-4 pr-3 text-sm font-bold text-brand-black shadow-soft transition duration-300 hover:bg-brand-bg ${menuOpen ? "ring-2 ring-brand-green/25" : ""}`}
              >
                <span className="max-w-[10rem] truncate sm:max-w-[14rem]">
                  {displayLabel}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`shrink-0 text-neutral-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            <WalletAccountDropdown
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
