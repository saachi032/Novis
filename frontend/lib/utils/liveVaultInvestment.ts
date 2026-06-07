import type { Investment } from "@/lib/context/OnChainHistoryContext";

export const LIVE_POSITION_ID_PREFIX = "live-position-";

export function isLivePositionInvestment(investment: Investment): boolean {
  return investment.id.startsWith(LIVE_POSITION_ID_PREFIX);
}

/** Build a display investment from live vault share reads (instant, no log scan). */
export function buildLiveVaultInvestment(
  address: string,
  shares: string,
  positionValue: string
): Investment | null {
  const shareNum = parseFloat(shares);
  const valueNum = parseFloat(positionValue);
  if (!Number.isFinite(shareNum) || shareNum <= 0) return null;

  const amount = Number.isFinite(valueNum) && valueNum > 0 ? valueNum.toFixed(6) : shares;
  const createdAt = Date.now();

  return {
    id: `${LIVE_POSITION_ID_PREFIX}${address.toLowerCase()}`,
    amount,
    amountUSD: amount,
    createdAt,
    riskLevel: "balanced",
    duration: "weekly",
    transactions: [
      {
        id: `${LIVE_POSITION_ID_PREFIX}${address.toLowerCase()}-deposit`,
        type: "deposit",
        amount,
        amountUSD: amount,
        timestamp: createdAt,
        txHash: "live",
        status: "active",
        riskLevel: "balanced",
        duration: "weekly",
        shares,
        note:
          "Your current vault balance. Individual deposit transactions load separately from chain history.",
      },
    ],
    currentValue: amount,
    yieldEarned: "0",
    yields: [{ timestamp: createdAt, value: amount, yield: "0", apy: "0" }],
    status: "active",
  };
}
