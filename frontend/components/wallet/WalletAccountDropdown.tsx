"use client";

import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useEffect, useId, useState } from "react";
import { useWalletDisplayName } from "@/components/wallet/WalletDisplayNameContext";
import { shortenAddress } from "@/lib/walletDisplayName";

type Props = {
  open: boolean;
  onClose: () => void;
};

function initials(label: string, address: string): string {
  const t = label.trim();
  if (t.length >= 2 && !t.startsWith("0x")) {
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

export function WalletAccountDropdown({ open, onClose }: Props) {
  const labelId = useId();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: bal } = useBalance({
    address,
    query: { enabled: !!address && open },
  });
  const { displayLabel, displayName, saveDisplayName } = useWalletDisplayName();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEditingName(false);
      setNameError(null);
      setNameInput(displayName ?? "");
    }
  }, [open, displayName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !address) return null;

  const short = shortenAddress(address);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      /* ignore */
    }
  };

  const handleDisconnect = () => {
    onClose();
    disconnect();
  };

  const startEditName = () => {
    setNameInput(displayName ?? "");
    setNameError(null);
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameError(null);
    setNameInput(displayName ?? "");
  };

  const submitName = () => {
    const t = nameInput.trim();
    if (t.length < 1) {
      setNameError("Enter a name.");
      return;
    }
    if (t.length > 80) {
      setNameError("Max 80 characters.");
      return;
    }
    setNameError(null);
    saveDisplayName(t);
    setEditingName(false);
  };

  return (
    <div
      role="menu"
      aria-label="Wallet menu"
      className="absolute right-0 top-[calc(100%+10px)] z-[100] w-[min(calc(100vw-2rem),288px)] rounded-2xl border border-brand-gray/80 bg-white p-3 shadow-card"
    >
      {editingName ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p
              id={`${labelId}-edit`}
              className="text-sm font-bold text-brand-black"
            >
              {displayName ? "Edit name" : "Add name"}
            </p>
            <button
              type="button"
              onClick={cancelEditName}
              className="text-xs font-semibold text-neutral-500 hover:text-brand-black"
            >
              Back
            </button>
          </div>
          <p className="text-[11px] leading-snug text-neutral-500">
            Shown in the header. Stored on this device only.
          </p>
          <label htmlFor={`${labelId}-name`} className="sr-only">
            Your name
          </label>
          <input
            id={`${labelId}-name`}
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              setNameError(null);
            }}
            className="w-full rounded-xl border border-brand-gray px-3 py-2 text-sm text-brand-black outline-none ring-brand-green/25 placeholder:text-neutral-400 focus:ring-2"
          />
          {nameError ? (
            <p className="text-xs font-medium text-red-700">{nameError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditName}
              className="rounded-full border border-brand-gray px-3 py-1.5 text-xs font-semibold text-brand-black hover:bg-brand-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitName}
              className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d5a56]"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-3 border-b border-brand-gray/50 pb-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8a598] text-xs font-bold text-white"
              aria-hidden
            >
              {initials(displayLabel, address)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                id="wallet-dd-title"
                className="truncate text-sm font-bold text-brand-black"
              >
                {displayLabel}
              </p>
              <p className="truncate font-mono text-[11px] text-neutral-500">
                {short}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                {bal
                  ? `${Number(bal.formatted).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })} ${bal.symbol}`
                  : "—"}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={startEditName}
            className="mt-2 w-full rounded-xl py-2 text-left text-xs font-semibold text-brand-green hover:bg-brand-bg"
          >
            {displayName ? "Edit name" : "Add name"}
          </button>

          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              role="menuitem"
              onClick={copy}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-gray py-2 text-[11px] font-semibold text-brand-black hover:bg-brand-bg"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDisconnect}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-gray py-2 text-[11px] font-semibold text-brand-black hover:bg-brand-bg"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
