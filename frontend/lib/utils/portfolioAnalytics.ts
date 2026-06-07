import type { Investment, Transaction } from "@/lib/context/OnChainHistoryContext";
import { isLivePositionInvestment } from "@/lib/utils/liveVaultInvestment";

export type RiskLevel = Investment["riskLevel"];

export type ProtocolSplit = {
  aave: number;
  compound: number;
  morpho: number;
  total: number;
  aavePct: number;
  compoundPct: number;
  morphoPct: number;
};

export type RiskGroupSummary = {
  riskLevel: RiskLevel;
  label: string;
  hint: string;
  deposits: Investment[];
  depositCount: number;
  totalDeposited: number;
  estimatedCurrentValue: number;
  yieldUsd: number;
  yieldPct: number;
  allocationAtDeposit: ProtocolSplit;
};

export type PortfolioOverview = {
  totalDeposited: number;
  currentValue: number;
  totalYieldUsd: number;
  totalYieldPct: number;
  depositCount: number;
  liveProtocolSplit: ProtocolSplit | null;
  riskGroups: RiskGroupSummary[];
};

const RISK_META: Record<RiskLevel, { label: string; hint: string }> = {
  conservative: { label: "Low risk", hint: "40% to highest-yield protocol" },
  balanced: { label: "Medium risk", hint: "60% to highest-yield protocol" },
  aggressive: { label: "High risk", hint: "80% to highest-yield protocol" },
};

export function sumProtocolFromTransactions(transactions: Transaction[]): ProtocolSplit {
  let aave = 0;
  let compound = 0;
  let morpho = 0;

  for (const txn of transactions) {
    if (txn.type !== "deposit") continue;
    aave += parseFloat(txn.aaveAmount || "0") || 0;
    compound += parseFloat(txn.compoundAmount || "0") || 0;
    morpho += parseFloat(txn.morphoAmount || "0") || 0;
  }

  const total = aave + compound + morpho;
  return {
    aave,
    compound,
    morpho,
    total,
    aavePct: total > 0 ? (aave / total) * 100 : 0,
    compoundPct: total > 0 ? (compound / total) * 100 : 0,
    morphoPct: total > 0 ? (morpho / total) * 100 : 0,
  };
}

export function buildProtocolSplitFromBalances(
  aaveBalance: string,
  compoundBalance: string,
  morphoBalance: string
): ProtocolSplit {
  const aave = parseFloat(aaveBalance) || 0;
  const compound = parseFloat(compoundBalance) || 0;
  const morpho = parseFloat(morphoBalance) || 0;
  const total = aave + compound + morpho;
  return {
    aave,
    compound,
    morpho,
    total,
    aavePct: total > 0 ? (aave / total) * 100 : 0,
    compoundPct: total > 0 ? (compound / total) * 100 : 0,
    morphoPct: total > 0 ? (morpho / total) * 100 : 0,
  };
}

export function buildPortfolioOverview({
  investments,
  currentValue,
  aaveBalance,
  compoundBalance,
  morphoBalance,
  defaultRiskForLive,
}: {
  investments: Investment[];
  currentValue: number;
  aaveBalance: string;
  compoundBalance: string;
  morphoBalance: string;
  defaultRiskForLive?: RiskLevel;
}): PortfolioOverview {
  const onChain = investments.filter(
    (inv) => inv.status === "active" && !isLivePositionInvestment(inv)
  );
  const liveOnly = investments.filter(
    (inv) => inv.status === "active" && isLivePositionInvestment(inv)
  );

  let working = onChain.length > 0 ? onChain : liveOnly;

  if (working.length === 0 && currentValue > 0 && defaultRiskForLive) {
    working = [
      {
        id: "synthetic",
        amount: String(currentValue),
        amountUSD: String(currentValue),
        createdAt: Date.now(),
        riskLevel: defaultRiskForLive,
        duration: "weekly",
        transactions: [],
        currentValue: String(currentValue),
        yieldEarned: "0",
        yields: [],
        status: "active",
      },
    ];
  }

  const totalDeposited = working.reduce(
    (sum, inv) => sum + (parseFloat(inv.amount) || 0),
    0
  );

  const effectiveCurrent =
    currentValue > 0 ? currentValue : totalDeposited;

  const totalYieldUsd = effectiveCurrent - totalDeposited;
  const totalYieldPct =
    totalDeposited > 0 ? (totalYieldUsd / totalDeposited) * 100 : 0;

  const liveProtocolSplit = buildProtocolSplitFromBalances(
    aaveBalance,
    compoundBalance,
    morphoBalance
  );
  const hasLiveSplit = liveProtocolSplit.total > 0;

  const byRisk = new Map<RiskLevel, Investment[]>();
  for (const inv of working) {
    const list = byRisk.get(inv.riskLevel) ?? [];
    list.push(inv);
    byRisk.set(inv.riskLevel, list);
  }

  const riskLevels: RiskLevel[] = ["conservative", "balanced", "aggressive"];
  const riskGroups: RiskGroupSummary[] = riskLevels
    .map((riskLevel) => {
      const deposits = byRisk.get(riskLevel) ?? [];
      if (deposits.length === 0) return null;

      const groupDeposited = deposits.reduce(
        (sum, inv) => sum + (parseFloat(inv.amount) || 0),
        0
      );
      const share = totalDeposited > 0 ? groupDeposited / totalDeposited : 1;
      const estimatedCurrentValue = effectiveCurrent * share;
      const yieldUsd = estimatedCurrentValue - groupDeposited;
      const yieldPct = groupDeposited > 0 ? (yieldUsd / groupDeposited) * 100 : 0;

      const allTx = deposits.flatMap((d) => d.transactions);
      const allocationAtDeposit = sumProtocolFromTransactions(allTx);

      const meta = RISK_META[riskLevel];
      return {
        riskLevel,
        label: meta.label,
        hint: meta.hint,
        deposits,
        depositCount: deposits.length,
        totalDeposited: groupDeposited,
        estimatedCurrentValue,
        yieldUsd,
        yieldPct,
        allocationAtDeposit,
      };
    })
    .filter((g): g is RiskGroupSummary => g !== null);

  return {
    totalDeposited,
    currentValue: effectiveCurrent,
    totalYieldUsd,
    totalYieldPct,
    depositCount: working.length,
    liveProtocolSplit: hasLiveSplit ? liveProtocolSplit : null,
    riskGroups,
  };
}

export function formatUsd(amount: number, digits = 2): string {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPct(value: number, digits = 1): string {
  return value.toFixed(digits);
}
