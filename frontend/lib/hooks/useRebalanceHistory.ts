import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";

export type RebalanceProtocolLabel = "Aave v3" | "Compound v3" | "Morpho Blue";

export interface RebalanceEntry {
  id: string;
  when: string;
  timestamp: number;
  from: RebalanceProtocolLabel;
  to: RebalanceProtocolLabel;
  amount: string;
  reason: string;
}

const CHAIN_ID = 84532;

function protocolLabel(protocol: number): RebalanceProtocolLabel {
  if (protocol === 0) return "Aave v3";
  if (protocol === 1) return "Compound v3";
  return "Morpho Blue";
}

function formatUtc(timestamp: number) {
  return new Date(timestamp)
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    })
    .replace(/GMT[\+\-]/, "") + " UTC";
}

/**
 * Hook to manage rebalance history from on-chain events.
 */
export function useRebalanceHistory() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState<RebalanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    if (!address || !publicClient || chainId !== CHAIN_ID) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const logs = await publicClient.getContractEvents({
        address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
        abi: STRATEGY_ROUTER_ABI,
        eventName: "UserRebalanced",
        args: { user: address },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const blockTimestampCache = new Map<bigint, number>();
      const getTimestamp = async (blockNumber: bigint | null | undefined) => {
        if (blockNumber === null || blockNumber === undefined) return Date.now();
        const cached = blockTimestampCache.get(blockNumber);
        if (cached) return cached;
        const block = await publicClient.getBlock({ blockNumber });
        const ts = Number(block.timestamp) * 1000;
        blockTimestampCache.set(blockNumber, ts);
        return ts;
      };

      const entries = await Promise.all(
        (logs as any[]).map(async (log) => {
          const timestamp = await getTimestamp(log.blockNumber);
          const amount = formatUnits(BigInt(log.args?.amount ?? 0n), 6);
          return {
            id: `${log.transactionHash}-${log.logIndex ?? 0}`,
            when: formatUtc(timestamp),
            timestamp,
            from: protocolLabel(Number(log.args?.fromProtocol ?? 0)),
            to: protocolLabel(Number(log.args?.toProtocol ?? 0)),
            amount: `$${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            reason: "On-chain rebalance executed",
          } as RebalanceEntry;
        })
      );

      entries.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(entries);
    } catch (err) {
      console.error("Failed to load on-chain rebalance history:", err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, publicClient]);

  useEffect(() => {
    void refreshHistory();
    const timer = setInterval(() => {
      void refreshHistory();
    }, 30000);
    return () => clearInterval(timer);
  }, [refreshHistory]);

  const addRebalanceEntry = useCallback(async (..._args: unknown[]) => {
    await refreshHistory();
    return null;
  }, [refreshHistory]);

  const clearHistory = useCallback(async (..._args: unknown[]) => {
    await refreshHistory();
  }, [refreshHistory]);

  return {
    history,
    isLoading,
    refreshHistory,
    addRebalanceEntry,
    clearHistory,
  };
}
