import { useCallback, useState, useEffect } from "react";
import { useAccount } from "wagmi";

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "rebalance";
  amount: string;
  amountUSD: string;
  timestamp: number;
  txHash: string;
  status: "pending" | "success" | "failed";
  riskLevel: "conservative" | "balanced" | "aggressive";
  duration: "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly";
  protocol?: "aave" | "compound";
  note?: string;
  shares?: string;
}

export interface Investment {
  id: string;
  amount: string;
  amountUSD: string;
  createdAt: number;
  riskLevel: "conservative" | "balanced" | "aggressive";
  duration: "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly";
  transactions: Transaction[];
  currentValue?: string;
  yieldEarned?: string;
  yields: YieldSnapshot[];
  status: "active" | "withdrawn" | "failed";
}

export interface YieldSnapshot {
  timestamp: number;
  value: string; // Current total value
  yield: string; // Yield earned so far
  apy: string; // Current APY at that time
}

/**
 * Hook to manage transaction and investment history
 */
export function useTransactionHistory() {
  const { address } = useAccount();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (!address) {
      setInvestments([]);
      setIsLoading(false);
      return;
    }

    try {
      const key = `investments_${address}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setInvestments(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load investment history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Save to localStorage whenever investments change
  const saveInvestments = useCallback((newInvestments: Investment[]) => {
    if (!address) return;

    try {
      const key = `investments_${address}`;
      localStorage.setItem(key, JSON.stringify(newInvestments));
      setInvestments(newInvestments);
    } catch (err) {
      console.error("Failed to save investment history:", err);
    }
  }, [address]);

  const addTransaction = useCallback(
    (
      amount: string,
      riskLevel: "conservative" | "balanced" | "aggressive",
      duration: "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly",
      txHash: string,
      type: "deposit" | "withdrawal" | "rebalance" = "deposit"
    ) => {
      const investmentId = `inv_${Date.now()}`;
      const newInvestment: Investment = {
        id: investmentId,
        amount,
        amountUSD: amount, // In production, convert to USD
        createdAt: Date.now(),
        riskLevel,
        duration,
        transactions: [
          {
            id: `txn_${Date.now()}`,
            type,
            amount,
            amountUSD: amount,
            timestamp: Date.now(),
            txHash,
            status: "pending",
            riskLevel,
            duration,
          },
        ],
        currentValue: amount,
        yieldEarned: "0",
        yields: [
          {
            timestamp: Date.now(),
            value: amount,
            yield: "0",
            apy: "0",
          },
        ],
        status: "active",
      };

      const updated = [...investments, newInvestment];
      saveInvestments(updated);
      return investmentId;
    },
    [investments, saveInvestments]
  );

  const updateTransactionStatus = useCallback(
    (investmentId: string, txHash: string, status: "pending" | "success" | "failed") => {
      const updated = investments.map((inv) => {
        if (inv.id === investmentId) {
          return {
            ...inv,
            transactions: inv.transactions.map((txn) =>
              txn.txHash === txHash ? { ...txn, status } : txn
            ),
            status: status === "failed" ? "failed" : inv.status,
          };
        }
        return inv;
      });
      saveInvestments(updated);
    },
    [investments, saveInvestments]
  );

  const addYieldSnapshot = useCallback(
    (investmentId: string, value: string, yield_: string, apy: string) => {
      const updated = investments.map((inv) => {
        if (inv.id === investmentId) {
          return {
            ...inv,
            currentValue: value,
            yieldEarned: yield_,
            yields: [
              ...inv.yields,
              {
                timestamp: Date.now(),
                value,
                yield: yield_,
                apy,
              },
            ],
          };
        }
        return inv;
      });
      saveInvestments(updated);
    },
    [investments, saveInvestments]
  );

  const getInvestmentById = useCallback(
    (id: string): Investment | undefined => {
      return investments.find((inv) => inv.id === id);
    },
    [investments]
  );

  const getActiveInvestments = useCallback(() => {
    return investments.filter((inv) => inv.status === "active");
  }, [investments]);

  const getTotalYield = useCallback(() => {
    return investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.yieldEarned || "0"), 0)
      .toFixed(2);
  }, [investments]);

  return {
    investments,
    isLoading,
    addTransaction,
    updateTransactionStatus,
    addYieldSnapshot,
    getInvestmentById,
    getActiveInvestments,
    getTotalYield,
  };
}
