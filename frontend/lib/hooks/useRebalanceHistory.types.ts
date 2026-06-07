export type RebalanceProtocolLabel = "Aave v3" | "Compound v3" | "Morpho Blue";

export type RebalanceFromLabel = RebalanceProtocolLabel | "USDC Vault";
export type RebalanceToLabel = RebalanceProtocolLabel | "Strategy split";

export interface RebalanceEntry {
  id: string;
  when: string;
  timestamp: number;
  from: RebalanceFromLabel;
  to: RebalanceToLabel;
  amount: string;
  reason: string;
}
