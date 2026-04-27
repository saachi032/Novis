export const RISK_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'setStrategy',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'risk', type: 'uint8' },
      { name: 'duration', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getUserStrategy',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'riskPercentage', type: 'uint8' },
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
