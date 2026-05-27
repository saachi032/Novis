import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { BASE_SEPOLIA_ADDRESSES, DEPLOYMENT_BLOCK } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";
import { getContractEventsInChunks } from "@/lib/utils/chainEvents";

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "rebalance";
  amount: string;
  amountUSD: string;
  timestamp: number;
  txHash: string;
  status: "active" | "failed" | "pending";
  riskLevel: "conservative" | "balanced" | "aggressive";
  duration: "daily" | "weekly" | "monthly" | "quarterly" | "halfYearly";
  aaveAmount?: string;
  compoundAmount?: string;
  morphoAmount?: string;
  aavePercentage?: number;
  compoundPercentage?: number;
  morphoPercentage?: number;
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
  value: string;
  yield: string;
  apy: string;
}

export interface ProtocolAllocationSnapshot {
  aaveAmount?: string;
  compoundAmount?: string;
  morphoAmount?: string;
  aavePercentage?: number;
  compoundPercentage?: number;
  morphoPercentage?: number;
}

type StrategySnapshot = {
  timestamp: number;
  riskLevel: Investment["riskLevel"];
  duration: Investment["duration"];
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CHAIN_ID = 84532;
const USDC_DECIMALS = 6;
const historyCache = new Map<string, { timestamp: number; investments: Investment[] }>();
const HISTORY_CACHE_TTL_MS = 600_000;

function formatUsd(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

function mapRiskLevel(riskProfile: number): Investment["riskLevel"] {
  if (riskProfile === 0) return "conservative";
  if (riskProfile === 2) return "aggressive";
  return "balanced";
}

function mapDuration(checkingDuration: number): Investment["duration"] {
  const options: Investment["duration"][] = [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "halfYearly",
  ];
  return options[checkingDuration] ?? "weekly";
}

function protocolLabel(protocol: number): "Aave v3" | "Compound v3" | "Morpho Blue" {
  if (protocol === 0) return "Aave v3";
  if (protocol === 1) return "Compound v3";
  return "Morpho Blue";
}

function latestStrategyAt(strategies: StrategySnapshot[], timestamp: number): StrategySnapshot {
  let selected = strategies[0];
  for (const snap of strategies) {
    if (snap.timestamp <= timestamp) {
      selected = snap;
    } else {
      break;
    }
  }
  return selected ?? { timestamp, riskLevel: "balanced", duration: "weekly" };
}

function attachTransaction(
  investments: Investment[],
  predicate: (investment: Investment) => boolean,
  transaction: Transaction,
  markWithdrawn = false
) {
  const index = [...investments].reverse().findIndex(predicate);
  if (index === -1) return investments;
  const realIndex = investments.length - 1 - index;
  const next = [...investments];
  const target = next[realIndex];
  next[realIndex] = {
    ...target,
    transactions: [...target.transactions, transaction],
    status: markWithdrawn ? "withdrawn" : target.status,
    currentValue: markWithdrawn ? "0" : target.currentValue,
  };
  return next;
}

/**
 * Hook to manage transaction and investment history from on-chain events.
 */
export function useTransactionHistory() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    if (!publicClient || chainId !== CHAIN_ID) {
      setInvestments([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = address
      ? `${chainId}:${address.toLowerCase()}`
      : `${chainId}:all`;
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL_MS) {
      setInvestments(cached.investments);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [
        depositLogs,
        withdrawLogs,
        investedLogs,
        redeemedLogs,
        rebalanceLogs,
        strategyLogs,
      ] = await Promise.all([
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.vaultManager,
          abi: VAULT_MANAGER_ABI,
          eventName: "Deposit",
          args: address ? { owner: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.vaultManager,
          abi: VAULT_MANAGER_ABI,
          eventName: "Withdraw",
          args: address ? { owner: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
          abi: STRATEGY_ROUTER_ABI,
          eventName: "UserFundsInvested",
          args: address ? { user: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
          abi: STRATEGY_ROUTER_ABI,
          eventName: "UserFundsRedeemed",
          args: address ? { user: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
          abi: STRATEGY_ROUTER_ABI,
          eventName: "UserRebalanced",
          args: address ? { user: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
        getContractEventsInChunks({
          publicClient,
          address: BASE_SEPOLIA_ADDRESSES.riskRegistry,
          abi: RISK_REGISTRY_ABI,
          eventName: "StrategySet",
          args: address ? { user: address } : undefined,
          fromBlock: DEPLOYMENT_BLOCK,
        }),
      ]);

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

      const strategySnapshots: StrategySnapshot[] = await Promise.all(
        (strategyLogs as any[]).map(async (log) => ({
          timestamp: await getTimestamp(log.blockNumber),
          riskLevel: mapRiskLevel(Number(log.args?.riskProfile ?? 1)),
          duration: mapDuration(Number(log.args?.checkingDuration ?? 1)),
        }))
      ).then((snapshots) =>
        snapshots.sort((a, b) => a.timestamp - b.timestamp)
      );

      const investedByTx = new Map<string, any>();
      for (const log of investedLogs as any[]) {
        investedByTx.set(log.transactionHash, log);
      }
      const redeemedByTx = new Map<string, any>();
      for (const log of redeemedLogs as any[]) {
        redeemedByTx.set(log.transactionHash, log);
      }
      const rebalanceByTx = new Map<string, any>();
      for (const log of rebalanceLogs as any[]) {
        rebalanceByTx.set(log.transactionHash, log);
      }

      const depositsSorted = [...(depositLogs as any[])].sort((a, b) => {
        const aBlock = Number(a.blockNumber ?? 0n);
        const bBlock = Number(b.blockNumber ?? 0n);
        if (aBlock !== bBlock) return aBlock - bBlock;
        return Number(a.logIndex ?? 0n) - Number(b.logIndex ?? 0n);
      });

      let nextInvestments: Investment[] = [];
      for (const log of depositsSorted) {
        const txHash = String(log.transactionHash);
        const timestamp = await getTimestamp(log.blockNumber);
        const strategy = latestStrategyAt(strategySnapshots, timestamp);
        const assets = BigInt(log.args?.assets ?? 0n);
        const shares = BigInt(log.args?.shares ?? 0n);
        const invested = investedByTx.get(txHash);
        const depositTransaction: Transaction = {
          id: `${txHash}-deposit`,
          type: "deposit",
          amount: formatUsd(assets),
          amountUSD: formatUsd(assets),
          timestamp,
          txHash,
          status: "active",
          riskLevel: strategy.riskLevel,
          duration: strategy.duration,
          shares: formatUsd(shares),
          aaveAmount: invested ? formatUsd(BigInt(invested.args?.toAave ?? 0n)) : undefined,
          compoundAmount: invested ? formatUsd(BigInt(invested.args?.toCompound ?? 0n)) : undefined,
          morphoAmount: invested ? formatUsd(BigInt(invested.args?.toMorpho ?? 0n)) : undefined,
          aavePercentage: invested ? Number(invested.args?.toAave ?? 0n) / Number(assets || 1n) * 100 : undefined,
          compoundPercentage: invested ? Number(invested.args?.toCompound ?? 0n) / Number(assets || 1n) * 100 : undefined,
          morphoPercentage: invested ? Number(invested.args?.toMorpho ?? 0n) / Number(assets || 1n) * 100 : undefined,
          note: invested ? "On-chain strategy allocation" : "Idle deposit pending allocation",
        };

        nextInvestments.push({
          id: txHash,
          amount: formatUsd(assets),
          amountUSD: formatUsd(assets),
          createdAt: timestamp,
          riskLevel: strategy.riskLevel,
          duration: strategy.duration,
          transactions: [depositTransaction],
          currentValue: formatUsd(assets),
          yieldEarned: "0",
          yields: [
            {
              timestamp,
              value: formatUsd(assets),
              yield: "0",
              apy: "0",
            },
          ],
          status: "active",
        });
      }

      const withdrawSorted = [...(withdrawLogs as any[])].sort((a, b) => {
        const aBlock = Number(a.blockNumber ?? 0n);
        const bBlock = Number(b.blockNumber ?? 0n);
        if (aBlock !== bBlock) return aBlock - bBlock;
        return Number(a.logIndex ?? 0n) - Number(b.logIndex ?? 0n);
      });

      for (const log of withdrawSorted) {
        const timestamp = await getTimestamp(log.blockNumber);
        const assets = BigInt(log.args?.assets ?? 0n);
        const shares = BigInt(log.args?.shares ?? 0n);
        const redeemed = redeemedByTx.get(String(log.transactionHash));
        const txn: Transaction = {
          id: `${log.transactionHash}-withdraw`,
          type: "withdrawal",
          amount: formatUsd(assets),
          amountUSD: formatUsd(assets),
          timestamp,
          txHash: String(log.transactionHash),
          status: "active",
          riskLevel: "balanced",
          duration: "weekly",
          shares: formatUsd(shares),
          aaveAmount: redeemed ? formatUsd(BigInt(redeemed.args?.fromAave ?? 0n)) : undefined,
          compoundAmount: redeemed ? formatUsd(BigInt(redeemed.args?.fromCompound ?? 0n)) : undefined,
          morphoAmount: redeemed ? formatUsd(BigInt(redeemed.args?.fromMorpho ?? 0n)) : undefined,
          note: "On-chain withdrawal from the vault",
        };

        nextInvestments = attachTransaction(
          nextInvestments,
          (investment) => investment.createdAt <= timestamp && investment.status === "active",
          txn,
          true
        );
      }

      const rebalanceSorted = [...(rebalanceLogs as any[])].sort((a, b) => {
        const aBlock = Number(a.blockNumber ?? 0n);
        const bBlock = Number(b.blockNumber ?? 0n);
        if (aBlock !== bBlock) return aBlock - bBlock;
        return Number(a.logIndex ?? 0n) - Number(b.logIndex ?? 0n);
      });

      for (const log of rebalanceSorted) {
        const timestamp = await getTimestamp(log.blockNumber);
        const txn: Transaction = {
          id: `${log.transactionHash}-rebalance`,
          type: "rebalance",
          amount: formatUsd(BigInt(log.args?.amount ?? 0n)),
          amountUSD: formatUsd(BigInt(log.args?.amount ?? 0n)),
          timestamp,
          txHash: String(log.transactionHash),
          status: "active",
          riskLevel: "balanced",
          duration: "weekly",
          note: `On-chain rebalance: ${protocolLabel(Number(log.args?.fromProtocol ?? 0))} -> ${protocolLabel(Number(log.args?.toProtocol ?? 0))}`,
        };

        nextInvestments = attachTransaction(
          nextInvestments,
          (investment) => investment.createdAt <= timestamp && investment.status === "active",
          txn
        );
      }

      const sorted = nextInvestments.sort((a, b) => b.createdAt - a.createdAt);
      historyCache.set(cacheKey, { timestamp: Date.now(), investments: sorted });
      setInvestments(sorted);
    } catch (err) {
      console.error("Failed to load on-chain investment history:", err);
      if (!cached) {
        setError(err instanceof Error ? err.message : "Failed to load on-chain history");
        setInvestments([]);
      } else {
        setInvestments(cached.investments);
        setError(null);
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

  const addTransaction = useCallback(
    async (..._args: unknown[]) => {
      await refreshHistory();
      return `chain_${Date.now()}`;
    },
    [refreshHistory]
  );

  const updateTransactionStatus = useCallback((..._args: unknown[]) => {
    void refreshHistory();
  }, [refreshHistory]);

  const updateLatestTransactionHashAndStatus = useCallback((..._args: unknown[]) => {
    void refreshHistory();
  }, [refreshHistory]);

  const addYieldSnapshot = useCallback((..._args: unknown[]) => {
    void refreshHistory();
  }, [refreshHistory]);

  const getInvestmentById = useCallback(
    (id: string): Investment | undefined => investments.find((inv) => inv.id === id),
    [investments]
  );

  const getActiveInvestments = useCallback(
    () => investments.filter((inv) => inv.status === "active"),
    [investments]
  );

  const getTotalYield = useCallback(
    () =>
      investments
        .filter((inv) => inv.status === "active")
        .reduce((sum, inv) => sum + parseFloat(inv.yieldEarned || "0"), 0)
        .toFixed(2),
    [investments]
  );

  return {
    investments,
    isLoading,
    error,
    refreshHistory,
    addTransaction,
    updateTransactionStatus,
    updateLatestTransactionHashAndStatus,
    addYieldSnapshot,
    getInvestmentById,
    getActiveInvestments,
    getTotalYield,
  };
}
