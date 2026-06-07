export type RiskLevelStr = "Conservative" | "Balanced" | "Aggressive" | "Unknown";

export interface DepositRecord {
  id: string;
  timestamp: number;
  amount: number;
  riskLevel: RiskLevelStr;
  txHash: string;
}

export interface RiskGroup {
  riskLevel: RiskLevelStr;
  totalDeposited: number;
}

export function parseDepositHistory(events: any[]): {
  deposits: DepositRecord[];
  groupedByRisk: RiskGroup[];
  totalDeposited: number;
} {
  // Sort events by blockNumber / timestamp ascending
  const sorted = [...events].sort((a, b) => {
    if (a.blockNumber === b.blockNumber) {
      return a.timestamp - b.timestamp;
    }
    return a.blockNumber - b.blockNumber;
  });

  let currentRisk: RiskLevelStr = "Balanced"; // Default before first set
  const deposits: DepositRecord[] = [];
  let totalDeposited = 0;

  const grouped: Record<RiskLevelStr, number> = {
    Conservative: 0,
    Balanced: 0,
    Aggressive: 0,
    Unknown: 0,
  };

  for (const event of sorted) {
    if (event.eventName === "StrategySet") {
      const riskEnum = event.args?.riskProfile;
      if (riskEnum === 0) currentRisk = "Conservative";
      else if (riskEnum === 1) currentRisk = "Balanced";
      else if (riskEnum === 2) currentRisk = "Aggressive";
    } else if (event.eventName === "Deposit") {
      const assets = event.args?.assets;
      if (assets) {
        // USDC has 6 decimals
        const amount = Number(assets) / 1e6;
        deposits.push({
          id: event._id || event.transactionHash,
          timestamp: event.timestamp * 1000,
          amount,
          riskLevel: currentRisk,
          txHash: event.transactionHash,
        });
        totalDeposited += amount;
        grouped[currentRisk] += amount;
      }
    } else if (event.eventName === "Withdraw") {
      const assets = event.args?.assets;
      if (assets) {
        const amount = Number(assets) / 1e6;
        // Subtract from total deposited, floor at 0
        totalDeposited = Math.max(0, totalDeposited - amount);
        
        // Subtract from grouped amounts proportionally, or just from the current one for simplicity
        // For simplicity, we just reduce the current active risk's deposited amount, floored at 0
        grouped[currentRisk] = Math.max(0, grouped[currentRisk] - amount);
      }
    }
  }

  const groupedArray = Object.entries(grouped)
    .filter(([_, val]) => val > 0)
    .map(([riskLevel, total]) => ({
      riskLevel: riskLevel as RiskLevelStr,
      totalDeposited: total,
    }));

  return {
    deposits: deposits.reverse(), // Newest first for UI
    groupedByRisk: groupedArray,
    totalDeposited,
  };
}
