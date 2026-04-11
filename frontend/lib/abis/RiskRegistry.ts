export const RISK_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'setStrategy',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'riskPercentage', type: 'uint256' },
      { name: 'durationSeconds', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getUserStrategy',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'riskPercentage', type: 'uint256' },
      { name: 'durationSeconds', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'hasStrategy',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'canRebalance',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'updateLastRebalanceTime',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
] as const;
