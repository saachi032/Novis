import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { BASE_SEPOLIA_ADDRESSES, DEPLOYMENT_BLOCK } from "@/lib/contracts";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { getContractEventsInChunks } from "@/lib/utils/chainEvents";

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
const historyCache = new Map<string, { timestamp: number; history: RebalanceEntry[] }>();
const HISTORY_CACHE_TTL_MS = 600_000;

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
    if (!publicClient || chainId !== CHAIN_ID) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = address
      ? `${chainId}:${address.toLowerCase()}`
      : `${chainId}:all`;
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL_MS) {
      setHistory(cached.history);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const logs = await getContractEventsInChunks({
        publicClient,
        address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
        abi: STRATEGY_ROUTER_ABI,
        eventName: "UserRebalanced",
        args: address ? { user: address } : undefined,
        fromBlock: DEPLOYMENT_BLOCK,
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
      historyCache.set(cacheKey, { timestamp: Date.now(), history: entries });
      setHistory(entries);
    } catch (err) {
      console.error("Failed to load on-chain rebalance history:", err);
      if (!cached) {
        setHistory([]);
      } else {
        setHistory(cached.history);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, publicClient]);

  // Only load once on mount — refreshHistory is stable due to caching
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await refreshHistory();
    };
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
