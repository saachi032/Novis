import { parseUnits, formatUnits } from 'viem';

export const USDC_DECIMALS = 6;

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

export function bpsToPercentage(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2);
}

export function percentageToBps(percentage: number): number {
  return Math.round(percentage * 100);
}

export const RISK_LEVELS = {
  CONSERVATIVE: { label: 'Conservative', value: 20 },
  BALANCED: { label: 'Balanced', value: 50 },
  MODERATE: { label: 'Moderate Risk', value: 60 },
  AGGRESSIVE: { label: 'Aggressive', value: 80 },
} as const;

export const REBALANCE_DURATIONS = {
  DAILY: { label: 'Daily', seconds: 86_400 },
  WEEKLY: { label: 'Weekly', seconds: 604_800 },
  MONTHLY: { label: 'Monthly', seconds: 2_592_000 },
  QUARTERLY: { label: 'Quarterly', seconds: 7_776_000 },
} as const;
