import { useOnChainHistory } from "@/lib/context/OnChainHistoryContext";

export type {
  RebalanceProtocolLabel,
  RebalanceFromLabel,
  RebalanceToLabel,
  RebalanceEntry,
} from "@/lib/hooks/useRebalanceHistory.types";

/**
 * Rebalance history from shared on-chain history context (no duplicate RPC fetch).
 */
export function useRebalanceHistory() {
  const { rebalanceHistory, isLoading, refreshHistory } = useOnChainHistory();

  return {
    history: rebalanceHistory,
    isLoading,
    refreshHistory: () => refreshHistory(true),
    addRebalanceEntry: () => refreshHistory(true),
    clearHistory: () => refreshHistory(true),
  };
}
