"use client";

import { useState } from "react";
import { DepositPanel } from "@/components/DepositPanel";
import { WithdrawPanel } from "@/components/WithdrawPanel";

type Tab = "deposit" | "withdraw";
export type DepositWithdrawVariant = "full" | "deposit-only" | "withdraw-only";

export function DepositWithdrawPanel({
  variant = "full",
}: {
  variant?: DepositWithdrawVariant;
} = {}) {
  const [activeTab, setActiveTab] = useState<Tab>("deposit");

  const showTabs = variant === "full";
  const effectiveTab: Tab =
    variant === "deposit-only"
      ? "deposit"
      : variant === "withdraw-only"
        ? "withdraw"
        : activeTab;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      {showTabs && (
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`pb-3 font-semibold text-sm transition ${
              activeTab === "deposit"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-neutral-600 border-b-2 border-transparent hover:text-brand-black"
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`pb-3 font-semibold text-sm transition ${
              activeTab === "withdraw"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-neutral-600 border-b-2 border-transparent hover:text-brand-black"
            }`}
          >
            Withdraw
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div>
        {(effectiveTab === "deposit" && showTabs) && <DepositPanel />}
        {variant === "deposit-only" && <DepositPanel />}
        {(effectiveTab === "withdraw" && showTabs) && <WithdrawPanel />}
        {variant === "withdraw-only" && <WithdrawPanel />}
      </div>
    </div>
  );
}
