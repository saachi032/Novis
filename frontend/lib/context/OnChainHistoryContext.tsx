"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { BASE_SEPOLIA_ADDRESSES, DEPLOYMENT_BLOCK } from "@/lib/contracts";
import { VAULT_MANAGER_ABI } from "@/lib/abis/VaultManager";
import { STRATEGY_ROUTER_ABI } from "@/lib/abis/StrategyRouter";
import { RISK_REGISTRY_ABI } from "@/lib/abis/RiskRegistry";
import {
  getContractEventsFromAddresses,
  getContractEventsInChunks,
} from "@/lib/utils/chainEvents";
import { getLegacyVaultManagers } from "@/lib/utils/deploymentBlock";
import { isLivePositionInvestment } from "@/lib/utils/liveVaultInvestment";
import type { RebalanceEntry } from "@/lib/hooks/useRebalanceHistory.types";

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

type StrategySnapshot = {
  timestamp: number;
  riskLevel: Investment["riskLevel"];
  duration: Investment["duration"];
};

const CHAIN_ID = 84532;
const USDC_DECIMALS = 6;
const HISTORY_CACHE_TTL_MS = 1_800_000; // 30 min — reduce RPC load
const HISTORY_CACHE_VERSION = 3;

type HistoryCacheEntry = {
  timestamp: number;
  investments: Investment[];
  rebalanceHistory: RebalanceEntry[];
};

const historyCache = new Map<string, HistoryCacheEntry>();
const inFlightByKey = new Map<string, Promise<HistoryCacheEntry>>();

function formatUsd(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

function formatUtc(timestamp: number) {
  return (
    new Date(timestamp)
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      })
      .replace(/GMT[\+\-]/, "") + " UTC"
  );
}

function historyCacheKey(chainId: number, address: string) {
  return `${chainId}:${address.toLowerCase()}:v${HISTORY_CACHE_VERSION}`;
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

function buildAllocationNote(
  toAave: bigint,
  toCompound: bigint,
  toMorpho: bigint,
  total: bigint
): string {
  const denom = total > 0n ? total : 1n;
  const parts: string[] = [];
  if (toAave > 0n) parts.push(`Aave ${((Number(toAave) / Number(denom)) * 100).toFixed(1)}%`);
  if (toCompound > 0n) parts.push(`Compound ${((Number(toCompound) / Number(denom)) * 100).toFixed(1)}%`);
  if (toMorpho > 0n) parts.push(`Morpho ${((Number(toMorpho) / Number(denom)) * 100).toFixed(1)}%`);
  return parts.length > 0 ? `Initial allocation: ${parts.join(", ")}` : "Initial allocation pending";
}

type OnChainHistoryContextValue = {
  investments: Investment[];
  rebalanceHistory: RebalanceEntry[];
  isLoading: boolean;
  error: string | null;
  refreshHistory: (force?: boolean) => Promise<void>;
  getInvestmentById: (id: string) => Investment | undefined;
  getActiveInvestments: () => Investment[];
  getTotalYield: () => string;
};

const OnChainHistoryContext = createContext<OnChainHistoryContextValue | null>(null);

async function buildLivePositionFallback(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}`
): Promise<Investment | null> {
  const shares = (await publicClient.readContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;

  if (shares <= 0n) return null;

  const [totalAssets, totalSupply, headBlock] = await Promise.all([
    publicClient.readContract({
      address: BASE_SEPOLIA_ADDRESSES.vaultManager,
      abi: VAULT_MANAGER_ABI,
      functionName: "totalAssets",
    }) as Promise<bigint>,
    publicClient.readContract({
      address: BASE_SEPOLIA_ADDRESSES.vaultManager,
      abi: VAULT_MANAGER_ABI,
      functionName: "totalSupply",
    }) as Promise<bigint>,
    publicClient.getBlock({ blockTag: "latest" }),
  ]);

  const valueBigInt =
    totalSupply > 0n ? (shares * totalAssets) / totalSupply : shares;
  const valueStr = formatUsd(valueBigInt);
  const createdAt = Number(headBlock.timestamp) * 1000;

  return {
    id: `live-position-${address.toLowerCase()}`,
    amount: valueStr,
    amountUSD: valueStr,
    createdAt,
    riskLevel: "balanced",
    duration: "weekly",
    transactions: [
      {
        id: `live-position-${address.toLowerCase()}-deposit`,
        type: "deposit",
        amount: valueStr,
        amountUSD: valueStr,
        timestamp: createdAt,
        txHash: "live",
        status: "active",
        riskLevel: "balanced",
        duration: "weekly",
        shares: formatUsd(shares),
        note:
          "Live vault balance — individual deposit logs could not be loaded (RPC limits or older vault). Your funds are still on-chain.",
      },
    ],
    currentValue: valueStr,
    yieldEarned: "0",
    yields: [{ timestamp: createdAt, value: valueStr, yield: "0", apy: "0" }],
    status: "active",
  };
}

async function fetchOnChainHistory(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}`
): Promise<HistoryCacheEntry> {
  const cacheKey = historyCacheKey(CHAIN_ID, address);

  // 1. Fetch from our new internal indexer (MongoDB via Next.js API)
  const res = await fetch(`/api/history?address=${address}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch history from API");
  }
  const data = await res.json();
  const events = data.events as any[];

  // 2. Separate events by name
  const strategyLogs = events.filter(e => e.eventName === "StrategySet");
  const depositLogs = events.filter(e => e.eventName === "Deposit");
  const investedLogs = events.filter(e => e.eventName === "UserFundsInvested");
  const withdrawLogs = events.filter(e => e.eventName === "Withdraw");
  const redeemedLogs = events.filter(e => e.eventName === "UserFundsRedeemed");
  const rebalanceLogs = events.filter(e => e.eventName === "UserRebalanced");

  const strategySnapshots: StrategySnapshot[] = strategyLogs.map((log) => ({
    timestamp: log.timestamp,
    riskLevel: mapRiskLevel(Number(log.args?.riskProfile ?? 1)),
    duration: mapDuration(Number(log.args?.checkingDuration ?? 1)),
  })).sort((a, b) => a.timestamp - b.timestamp);

  const investedByTx = new Map<string, any>();
  for (const log of investedLogs as any[]) {
    investedByTx.set(log.transactionHash, log);
  }
  const redeemedByTx = new Map<string, any>();
  for (const log of redeemedLogs as any[]) {
    redeemedByTx.set(log.transactionHash, log);
  }

  const depositsSorted = depositLogs.sort((a, b) => {
    const aBlock = a.blockNumber ?? 0;
    const bBlock = b.blockNumber ?? 0;
    if (aBlock !== bBlock) return aBlock - bBlock;
    return a.timestamp - b.timestamp;
  });

  let nextInvestments: Investment[] = [];
  const rebalanceHistory: RebalanceEntry[] = [];

  for (const log of depositsSorted) {
    const txHash = String(log.transactionHash);
    const timestamp = log.timestamp;
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
      aavePercentage: invested
        ? (Number(invested.args?.toAave ?? 0n) / Number(assets || 1n)) * 100
        : undefined,
      compoundPercentage: invested
        ? (Number(invested.args?.toCompound ?? 0n) / Number(assets || 1n)) * 100
        : undefined,
      morphoPercentage: invested
        ? (Number(invested.args?.toMorpho ?? 0n) / Number(assets || 1n)) * 100
        : undefined,
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
      yields: [{ timestamp, value: formatUsd(assets), yield: "0", apy: "0" }],
      status: "active",
    });

    if (invested) {
      const total = BigInt(invested.args?.amount ?? assets);
      const toAave = BigInt(invested.args?.toAave ?? 0n);
      const toCompound = BigInt(invested.args?.toCompound ?? 0n);
      const toMorpho = BigInt(invested.args?.toMorpho ?? 0n);
      rebalanceHistory.push({
        id: `${txHash}-allocate`,
        when: formatUtc(timestamp),
        timestamp,
        from: "USDC Vault",
        to: "Strategy split",
        amount: `$${Number(formatUsd(total)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        reason: buildAllocationNote(toAave, toCompound, toMorpho, total),
      });
    }
  }

  const withdrawSorted = withdrawLogs.sort((a, b) => {
    const aBlock = a.blockNumber ?? 0;
    const bBlock = b.blockNumber ?? 0;
    if (aBlock !== bBlock) return aBlock - bBlock;
    return a.timestamp - b.timestamp;
  });

  for (const log of withdrawSorted) {
    const timestamp = log.timestamp;
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
      false
    );
  }

  const rebalanceSorted = rebalanceLogs.sort((a, b) => {
    const aBlock = a.blockNumber ?? 0;
    const bBlock = b.blockNumber ?? 0;
    if (aBlock !== bBlock) return aBlock - bBlock;
    return a.timestamp - b.timestamp;
  });

  for (const log of rebalanceSorted) {
    const timestamp = log.timestamp;
    const amount = BigInt(log.args?.amount ?? 0n);
    const from = protocolLabel(Number(log.args?.fromProtocol ?? 0));
    const to = protocolLabel(Number(log.args?.toProtocol ?? 0));

    const txn: Transaction = {
      id: `${log.transactionHash}-rebalance`,
      type: "rebalance",
      amount: formatUsd(amount),
      amountUSD: formatUsd(amount),
      timestamp,
      txHash: String(log.transactionHash),
      status: "active",
      riskLevel: "balanced",
      duration: "weekly",
      note: `On-chain rebalance: ${from} -> ${to}`,
    };

    nextInvestments = attachTransaction(
      nextInvestments,
      (investment) => investment.createdAt <= timestamp && investment.status === "active",
      txn
    );

    rebalanceHistory.push({
      id: `${log.transactionHash}-${log.logIndex ?? 0}`,
      when: formatUtc(timestamp),
      timestamp,
      from,
      to,
      amount: `$${Number(formatUsd(amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      reason: "Automated rebalance to higher-yield protocol",
    });
  }

  let sortedInvestments = nextInvestments.sort((a, b) => b.createdAt - a.createdAt);
  rebalanceHistory.sort((a, b) => b.timestamp - a.timestamp);

  const activeCount = sortedInvestments.filter((inv) => inv.status === "active").length;
  if (activeCount === 0) {
    const fallback = await buildLivePositionFallback(publicClient, address);
    if (fallback) {
      sortedInvestments = [fallback, ...sortedInvestments];
    }
  }

  const result = {
    timestamp: Date.now(),
    investments: sortedInvestments,
    rebalanceHistory,
  };
  historyCache.set(cacheKey, result);
  return result;
}

function loadHistory(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}`,
  force = false
): Promise<HistoryCacheEntry> {
  const cacheKey = historyCacheKey(CHAIN_ID, address);

  if (!force) {
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL_MS) {
      return Promise.resolve(cached);
    }
    const inFlight = inFlightByKey.get(cacheKey);
    if (inFlight) return inFlight;
  } else {
    historyCache.delete(cacheKey);
  }

  const promise = fetchOnChainHistory(publicClient, address).finally(() => {
    inFlightByKey.delete(cacheKey);
  });
  inFlightByKey.set(cacheKey, promise);
  return promise;
}

export function OnChainHistoryProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [rebalanceHistory, setRebalanceHistory] = useState<RebalanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClientRef = useRef(publicClient);
  publicClientRef.current = publicClient;

  const loadedKeyRef = useRef<string | null>(null);
  const fetchingKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const applyResult = useCallback((result: HistoryCacheEntry) => {
    setInvestments(result.investments);
    setRebalanceHistory(result.rebalanceHistory);
    setError(null);
  }, []);

  const applyLiveFallback = useCallback(
    async (wallet: `0x${string}`, keepExisting = true) => {
      const client = publicClientRef.current;
      if (!client) return;
      const fallback = await buildLivePositionFallback(client, wallet);
      if (!fallback) return;
      setInvestments((prev) => {
        const real = prev.filter((i) => !isLivePositionInvestment(i));
        if (keepExisting && real.length > 0) return prev;
        return [fallback, ...real];
      });
    },
    []
  );

  const refreshHistory = useCallback(async (force = false) => {
    const client = publicClientRef.current;
    const wallet = address;

    if (!client || chainId !== CHAIN_ID || !wallet) {
      loadedKeyRef.current = null;
      setInvestments([]);
      setRebalanceHistory([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cacheKey = historyCacheKey(chainId, wallet);

    if (!force && loadedKeyRef.current === cacheKey) {
      const cached = historyCache.get(cacheKey);
      if (cached) applyResult(cached);
      return;
    }

    if (force) {
      loadedKeyRef.current = null;
      fetchingKeyRef.current = null;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadHistory(client, wallet as `0x${string}`, force);
      if (requestId !== requestIdRef.current) return;
      applyResult(result);
      loadedKeyRef.current = cacheKey;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load on-chain investment history:", err);
      const cached = historyCache.get(cacheKey);
      if (cached) {
        applyResult(cached);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load on-chain history");
        await applyLiveFallback(wallet as `0x${string}`, false);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, chainId, applyResult, applyLiveFallback]);

  // Show live vault balance immediately — do not wait for the slow log scan.
  useEffect(() => {
    if (!address || chainId !== CHAIN_ID || !publicClientRef.current) return;
    void applyLiveFallback(address as `0x${string}`, true);
  }, [address, chainId, applyLiveFallback, Boolean(publicClient)]);

  // Fetch once per wallet — stable deps only (never publicClient / refreshHistory).
  useEffect(() => {
    if (!address || chainId !== CHAIN_ID) {
      loadedKeyRef.current = null;
      setInvestments([]);
      setRebalanceHistory([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!publicClientRef.current) return;

    const cacheKey = historyCacheKey(chainId, address);
    if (loadedKeyRef.current === cacheKey || fetchingKeyRef.current === cacheKey) return;

    fetchingKeyRef.current = cacheKey;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    loadHistory(publicClientRef.current, address as `0x${string}`, false)
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        applyResult(result);
        loadedKeyRef.current = cacheKey;
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load on-chain investment history:", err);
        const cached = historyCache.get(cacheKey);
        if (cached) {
          applyResult(cached);
          loadedKeyRef.current = cacheKey;
        } else {
          setError(err instanceof Error ? err.message : "Failed to load on-chain history");
          void applyLiveFallback(address as `0x${string}`, false);
        }
      })
      .finally(() => {
        if (fetchingKeyRef.current === cacheKey) fetchingKeyRef.current = null;
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, [address, chainId, applyResult, applyLiveFallback, Boolean(publicClient)]);

  const getInvestmentById = useCallback(
    (id: string) => investments.find((inv) => inv.id === id),
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

  const value = useMemo(
    () => ({
      investments,
      rebalanceHistory,
      isLoading,
      error,
      refreshHistory,
      getInvestmentById,
      getActiveInvestments,
      getTotalYield,
    }),
    [
      investments,
      rebalanceHistory,
      isLoading,
      error,
      refreshHistory,
      getInvestmentById,
      getActiveInvestments,
      getTotalYield,
    ]
  );

  return (
    <OnChainHistoryContext.Provider value={value}>{children}</OnChainHistoryContext.Provider>
  );
}

export function useOnChainHistory() {
  const ctx = useContext(OnChainHistoryContext);
  if (!ctx) {
    throw new Error("useOnChainHistory must be used within OnChainHistoryProvider");
  }
  return ctx;
}
