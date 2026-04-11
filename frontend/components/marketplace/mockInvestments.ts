export type MockInvestment = {
  id: string;
  name: string;
  protocol: string;
  deposited: number;
  currentValue: number;
  apy: number;
  yieldUsd: number;
  returnPct: number;
  chain: string;
  /** monthly yield for bar chart (USD, demo) */
  monthlyYield: number[];
  /** Aave / Compound split for position (%) */
  venueSplit: { label: string; pct: number }[];
};

export const MOCK_INVESTMENTS: MockInvestment[] = [
  {
    id: "vault-usdc",
    name: "Novis USDC Vault",
    protocol: "Aave v3 · Compound v3",
    deposited: 12500,
    currentValue: 12842,
    apy: 5.82,
    yieldUsd: 342,
    returnPct: 2.74,
    chain: "Base",
    monthlyYield: [18, 22, 19, 24, 28, 31],
    venueSplit: [
      { label: "Aave v3", pct: 42 },
      { label: "Compound v3", pct: 58 },
    ],
  },
  {
    id: "aave-direct",
    name: "Aave USDC (direct)",
    protocol: "Aave v3",
    deposited: 3000,
    currentValue: 3045,
    apy: 4.9,
    yieldUsd: 45,
    returnPct: 1.5,
    chain: "Base",
    monthlyYield: [5, 6, 7, 6, 8, 9],
    venueSplit: [{ label: "Aave v3", pct: 100 }],
  },
  {
    id: "compound-direct",
    name: "Compound USDC (direct)",
    protocol: "Compound v3",
    deposited: 5000,
    currentValue: 5120,
    apy: 6.1,
    yieldUsd: 120,
    returnPct: 2.4,
    chain: "Base",
    monthlyYield: [14, 16, 18, 17, 20, 21],
    venueSplit: [{ label: "Compound v3", pct: 100 }],
  },
];

export function getMockInvestmentById(id: string) {
  return MOCK_INVESTMENTS.find((investment) => investment.id === id) ?? null;
}
