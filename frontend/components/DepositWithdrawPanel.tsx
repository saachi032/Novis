"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";

export function DepositWithdrawPanel({
  defaultTab = "deposit",
}: {
  defaultTab?: "deposit" | "withdraw";
}) {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<"deposit" | "withdraw">(defaultTab);
  const [amount, setAmount] = useState("");

  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <div className="flex rounded-2xl border border-brand-gray/80 bg-brand-bg p-1">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition duration-300 ${tab === t
                ? "bg-white text-brand-black shadow-soft"
                : "text-neutral-500 hover:text-brand-black"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <label className="text-xs font-medium text-neutral-600">
          Amount (USDC)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-brand-gray bg-white px-4 py-3 text-sm text-brand-black outline-none ring-brand-green/30 placeholder:text-neutral-400 focus:ring-2"
          />
          <button
            type="button"
            className="shrink-0 rounded-2xl border border-brand-gray bg-white px-4 text-xs font-bold uppercase tracking-wide text-brand-black transition duration-300 hover:scale-105 hover:bg-brand-bg"
          >
            Max
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          className="mt-4 w-full accent-[#557571]"
          aria-label="Amount percentage"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-brand-gray/60 bg-brand-bg p-4 text-xs text-neutral-600">
        {tab === "deposit" ? (
          <>
            <p>
              <span className="text-neutral-500">Est. shares: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Share price: </span>
              <span className="font-semibold text-brand-black">$1.024</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">Projected yield (30d): </span>
              <span className="font-semibold text-brand-green">~0.48%</span>
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="text-neutral-500">Shares burned: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
            <p className="mt-2">
              <span className="text-neutral-500">USDC received: </span>
              <span className="font-semibold text-brand-black">—</span>
            </p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-brand-gray bg-white px-3 py-2 text-[11px] text-neutral-600">
        Allowance required? Approve USDC once, then confirm{" "}
        {tab === "deposit" ? "deposit" : "withdraw"} in your wallet.
      </div>

      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            type="button"
            className="mt-5 w-full rounded-full bg-brand-green py-3.5 text-sm font-semibold text-white transition duration-300 hover:scale-105 hover:bg-[#3d5a56] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            disabled={isConnected && !amount.trim()}
            onClick={() => {
              if (!isConnected) openConnectModal();
              else if (amount.trim()) {
                window.alert(
                  "VaultManager integration pending — set NEXT_PUBLIC_VAULT_ADDRESS and wire the ABI."
                );
              }
            }}
          >
            {!isConnected ? `Connect wallet to ${tab}` : `Confirm ${tab}`}
          </button>
        )}
      </ConnectButton.Custom>
      <p className="mt-2 text-center text-[10px] text-neutral-500">
        Gas on Base is typically low; exact fee shown in your wallet.
      </p>
    </div>
  );
}
