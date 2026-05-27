'use client';

import { useAccount, useReadContract } from 'wagmi';
import { BASE_SEPOLIA_ADDRESSES } from '@/lib/contracts';
import { VAULT_MANAGER_ABI } from '@/lib/abis/VaultManager';
import { STRATEGY_ROUTER_ABI } from '@/lib/abis/StrategyRouter';
import { formatUSDC } from '@/lib/utils/contractUtils';

export function ContractTest() {
  const { address, isConnected } = useAccount();

  // Read vault shares
  const { data: vaultShares, isLoading: isLoadingShares } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address, retry: false },
  });

  // Read total vault assets
  const { data: totalAssets, isLoading: isLoadingAssets } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.vaultManager,
    abi: VAULT_MANAGER_ABI,
    functionName: 'totalAssets',
    query: { retry: false },
  });

  // Read APYs
  const { data: apys, isLoading: isLoadingAPYs } = useReadContract({
    address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
    abi: STRATEGY_ROUTER_ABI,
    functionName: 'getCurrentAPYs',
    query: { retry: false },
  });

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
        Please connect your wallet first
      </div>
    );
  }

  const sharesFormatted = vaultShares ? formatUSDC(vaultShares) : '0';
  const assetsFormatted = totalAssets ? formatUSDC(totalAssets) : '0';
  const aaveAPY = apys ? (Number(apys[0]) / 100).toFixed(2) : '0';
  const compoundAPY = apys ? (Number(apys[1]) / 100).toFixed(2) : '0';
  const morphoAPY = apys ? (Number(apys[2]) / 100).toFixed(2) : '0';

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Smart Contract Connection Test</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Vault Shares */}
        <div className="p-4 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-600">Your Vault Shares</p>
          {isLoadingShares ? (
            <p className="text-lg font-semibold text-gray-400">Loading...</p>
          ) : (
            <p className="text-2xl font-bold text-blue-600">{sharesFormatted}</p>
          )}
        </div>

        {/* Total Assets */}
        <div className="p-4 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-600">Total Vault Assets</p>
          {isLoadingAssets ? (
            <p className="text-lg font-semibold text-gray-400">Loading...</p>
          ) : (
            <p className="text-2xl font-bold text-green-600">${assetsFormatted}</p>
          )}
        </div>

        {/* Aave APY */}
        <div className="p-4 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-600">Aave APY</p>
          {isLoadingAPYs ? (
            <p className="text-lg font-semibold text-gray-400">Loading...</p>
          ) : (
            <p className="text-2xl font-bold text-green-600">{aaveAPY}%</p>
          )}
        </div>

        {/* Compound APY */}
        <div className="p-4 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-600">Compound APY</p>
          {isLoadingAPYs ? (
            <p className="text-lg font-semibold text-gray-400">Loading...</p>
          ) : (
            <p className="text-2xl font-bold text-orange-600">{compoundAPY}%</p>
          )}
        </div>

        {/* Morpho APY */}
        <div className="p-4 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-600">Morpho APY</p>
          {isLoadingAPYs ? (
            <p className="text-lg font-semibold text-gray-400">Loading...</p>
          ) : (
            <p className="text-2xl font-bold text-violet-600">{morphoAPY}%</p>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-gray-600">Connected Wallet</p>
        <p className="text-xs font-mono text-green-700 break-all">{address}</p>
      </div>

      {/* Contract Addresses */}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">Contract Addresses</p>
        <div className="text-xs space-y-1 font-mono">
          <p>
            <span className="text-gray-600">VaultManager:</span> {BASE_SEPOLIA_ADDRESSES.vaultManager}
          </p>
          <p>
            <span className="text-gray-600">StrategyRouter:</span> {BASE_SEPOLIA_ADDRESSES.strategyRouter}
          </p>
          <p>
            <span className="text-gray-600">USDC:</span> {BASE_SEPOLIA_ADDRESSES.usdc}
          </p>
        </div>
      </div>
    </div>
  );
}
