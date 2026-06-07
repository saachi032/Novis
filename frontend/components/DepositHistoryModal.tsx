"use client";

import { useEffect, useState } from "react";
import type { DepositRecord } from "@/lib/utils/depositHistory";
import { format } from "date-fns";
import { useChainId } from "wagmi";

interface DepositHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposits: DepositRecord[];
}

export function DepositHistoryModal({ isOpen, onClose, deposits }: DepositHistoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const chainId = useChainId();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getExplorerLink = (hash: string) => {
    // Base Sepolia block explorer
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Conservative":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "Balanced":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "Aggressive":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal panel */}
      <div className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <div>
            <h3 className="font-display text-xl font-bold text-brand-black dark:text-white">
              Deposit History log
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              A precise chronological ledger of your investments and the active strategy at the time of deposit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {deposits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">No deposit history found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Strategy Active
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-brand-black dark:text-neutral-200">
                        {format(deposit.timestamp, "MMM d, yyyy • HH:mm")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-mono font-medium text-brand-black dark:text-neutral-200">
                        ${deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRiskColor(deposit.riskLevel)}`}>
                          {deposit.riskLevel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <a
                          href={getExplorerLink(deposit.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-green hover:text-brand-green/80 hover:underline flex items-center justify-end gap-1 text-xs"
                        >
                          {deposit.txHash.slice(0, 6)}...{deposit.txHash.slice(-4)}
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
