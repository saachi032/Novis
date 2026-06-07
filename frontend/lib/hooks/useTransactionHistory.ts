import { useCallback } from "react";
import { useOnChainHistory } from "@/lib/context/OnChainHistoryContext";

export type {
  Transaction,
  Investment,
  YieldSnapshot,
} from "@/lib/context/OnChainHistoryContext";

export type { ProtocolAllocationSnapshot } from "./useTransactionHistory.types";

/**
 * Investment history from shared on-chain history context (single RPC fetch per wallet).
 */
export function useTransactionHistory() {
  const {
    investments,
    isLoading,
    error,
    refreshHistory,
    getInvestmentById,
    getActiveInvestments,
    getTotalYield,
  } = useOnChainHistory();

  const forceRefresh = useCallback(() => refreshHistory(true), [refreshHistory]);

  return {
    investments,
    isLoading,
    error,
    refreshHistory: forceRefresh,
    addTransaction: async () => {
      await forceRefresh();
      return `chain_${Date.now()}`;
    },
    updateTransactionStatus: () => {
      void forceRefresh();
    },
    updateLatestTransactionHashAndStatus: () => {
      void forceRefresh();
    },
    addYieldSnapshot: () => {
      void forceRefresh();
    },
    getInvestmentById,
    getActiveInvestments,
    getTotalYield,
  };
}
