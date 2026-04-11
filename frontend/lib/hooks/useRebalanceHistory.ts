import { useCallback, useState, useEffect } from "react";
import { useAccount } from "wagmi";

export interface RebalanceEntry {
  id: string;
  when: string;
  timestamp: number;
  from: "Aave v3" | "Compound v3";
  to: "Aave v3" | "Compound v3";
  amount: string;
  reason: string;
}

/**
 * Hook to manage rebalance history
 */
export function useRebalanceHistory() {
  const { address } = useAccount();
  const [history, setHistory] = useState<RebalanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (!address) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      const key = `rebalance_history_${address}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load rebalance history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Save to localStorage whenever history changes
  const saveHistory = useCallback(
    (newHistory: RebalanceEntry[]) => {
      if (!address) return;

      try {
        const key = `rebalance_history_${address}`;
        localStorage.setItem(key, JSON.stringify(newHistory));
        setHistory(newHistory);
      } catch (err) {
        console.error("Failed to save rebalance history:", err);
      }
    },
    [address]
  );

  // Add a new rebalance entry
  const addRebalanceEntry = useCallback(
    (
      from: "Aave v3" | "Compound v3",
      to: "Aave v3" | "Compound v3",
      amount: string,
      reason: string
    ) => {
      const newEntry: RebalanceEntry = {
        id: `rebalance_${Date.now()}`,
        when: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        }).replace(/GMT[\+\-]/, "") + " UTC",
        timestamp: Date.now(),
        from,
        to,
        amount,
        reason,
      };

      const updated = [newEntry, ...history];
      console.log("Adding rebalance entry:", newEntry);
      console.log("Updated history:", updated);
      saveHistory(updated);
      return newEntry;
    },
    [history, saveHistory]
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return {
    history,
    isLoading,
    addRebalanceEntry,
    clearHistory,
  };
}
