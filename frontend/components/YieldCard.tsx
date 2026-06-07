"use client";

import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { useState } from "react";
import { BASE_SEPOLIA_ADDRESSES, vaultABI, strategyABI } from "@/lib/contracts";

export function YieldCard() {
    const { address, isConnected } = useAccount();
    const [depositedUSDC] = useState<number>(0);
    const hasDeposit = !!address;

    const { data, isError, isLoading } = useReadContracts({
        contracts: [
            {
                address: BASE_SEPOLIA_ADDRESSES.vaultManager,
                abi: vaultABI,
                functionName: "balanceOf",
                args: [address ?? "0x0000000000000000000000000000000000000000"],
            },
            {
                address: BASE_SEPOLIA_ADDRESSES.vaultManager,
                abi: vaultABI,
                functionName: "totalSupply",
            },
            {
                address: BASE_SEPOLIA_ADDRESSES.vaultManager,
                abi: vaultABI,
                functionName: "totalAssets",
            },
            {
                address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
                abi: strategyABI,
                functionName: "getCurrentAPYs",
            },
            {
                address: BASE_SEPOLIA_ADDRESSES.strategyRouter,
                abi: strategyABI,
                functionName: "getUserProtocolBalances",
                args: [address ?? "0x0000000000000000000000000000000000000000"],
            },
        ],
        query: {
            refetchInterval: 60_000,
            retry: false,
        },
    });

    if (!isConnected) {
        return (
            <div className="surface-card flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
                <div className="h-16 w-16 mb-4 rounded-full bg-brand-gray/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold font-display mb-2">Wallet Disconnected</h3>
                <p className="text-brand-black/60 max-w-xs">Connect your wallet to see your live vault yield and allocation stats.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="surface-card p-6 min-h-[300px] flex flex-col justify-between animate-pulse">
                <div className="h-8 w-1/3 bg-brand-gray/30 rounded mb-4" />
                <div className="space-y-4">
                    <div className="h-12 w-full bg-brand-gray/20 rounded" />
                    <div className="h-12 w-full bg-brand-gray/20 rounded" />
                    <div className="h-12 w-full bg-brand-gray/20 rounded" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="surface-card flex min-h-[300px] items-center justify-center p-6 text-red-500">
                Error loading yield data from contracts.
            </div>
        );
    }

    const [
        userSharesRes,
        totalSupplyRes,
        totalAssetsRes,
        apyRes,
        allocationRes,
    ] = data || [];

    const userSharesBN = (userSharesRes?.result as bigint) ?? BigInt(0);
    const totalSupplyBN = (totalSupplyRes?.result as bigint) ?? BigInt(0);
    const totalAssetsBN = (totalAssetsRes?.result as bigint) ?? BigInt(0);
    const apyArgs = (apyRes?.result as [bigint, bigint, bigint]) ?? [BigInt(0), BigInt(0), BigInt(0)];
    const apyValues = apyArgs.map((v) => Number(v) / 100);
    const apyPercent = (
        apyValues.filter((v) => Number.isFinite(v) && v > 0).reduce((sum, v) => sum + v, 0) /
        Math.max(1, apyValues.filter((v) => Number.isFinite(v) && v > 0).length)
    ).toFixed(2);

    const balancesArgs = (allocationRes?.result as [bigint, bigint, bigint]) ?? [BigInt(0), BigInt(0), BigInt(0)];
    const aaveBalance = Number(formatUnits(balancesArgs[0], 6));
    const compoundBalance = Number(formatUnits(balancesArgs[1], 6));
    const morphoBalance = Number(formatUnits(balancesArgs[2], 6));
    const totalBalance = aaveBalance + compoundBalance + morphoBalance;
    const aavePercent = totalBalance > 0 ? (aaveBalance / totalBalance) * 100 : 0;
    const compoundPercent = totalBalance > 0 ? (compoundBalance / totalBalance) * 100 : 0;

    let currentValueUSDC = 0;
    if (totalSupplyBN > BigInt(0)) {
        const valueBigInt = (userSharesBN * totalAssetsBN) / totalSupplyBN;
        currentValueUSDC = Number(formatUnits(valueBigInt, 6));
    }

    const yieldEarned = currentValueUSDC - depositedUSDC;
    let yieldPercent = 0;
    if (depositedUSDC > 0) {
        yieldPercent = (yieldEarned / depositedUSDC) * 100;
    }

    const formatUsd = (val: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

    return (
        <div className="surface-card p-6 flex flex-col space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-semibold text-brand-black/60 uppercase tracking-wider mb-1">
                        Current Value
                    </h3>
                    <div className="text-4xl font-display font-medium text-brand-green">
                        {formatUsd(currentValueUSDC)}
                    </div>
                </div>
                <div className="bg-brand-gray/10 px-3 py-1 rounded-full border border-brand-gray/30">
                    <span className="text-xs font-bold text-brand-green">
                        {apyPercent}% APY
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-bg rounded-xl p-4">
                    <div className="text-sm text-brand-black/60 mb-1">Deposited</div>
                    <div className="font-semibold text-lg">{formatUsd(depositedUSDC)}</div>
                </div>
                <div className="bg-brand-bg rounded-xl p-4">
                    <div className="text-sm text-brand-black/60 mb-1">All-Time Yield</div>
                    <div className={`font-semibold text-lg flex items-center space-x-1 ${yieldEarned > 0 ? "text-green-500" : ""}`}>
                        <span>{yieldEarned > 0 ? "+" : ""}{formatUsd(yieldEarned)}</span>
                        {yieldEarned !== 0 && (
                            <span className="text-xs">
                                ({yieldEarned > 0 ? "↑" : "↓"} {yieldPercent.toFixed(2)}%)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {hasDeposit && depositedUSDC === 0 && (
                <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded border border-orange-100">
                    Note: You have a deposit signature in session, but amount is 0.
                </div>
            )}

            {/* Allocation Bar */}
            <div className="pt-2 border-t border-brand-gray/20">
                <div className="flex justify-between items-end mb-2">
                    <h4 className="text-sm font-medium">Strategy Allocation</h4>
                    <span className="text-xs text-brand-black/50">100% USDC</span>
                </div>

                <div className="h-3 w-full bg-brand-gray/30 rounded-full overflow-hidden flex">
                    {aavePercent > 0 && (
                        <div
                            className="h-full bg-[#B6509E] transition-all duration-500"
                            style={{ width: `${aavePercent}%` }}
                            title={`Aave: ${aavePercent}%`}
                        />
                    )}
                    {compoundPercent > 0 && (
                        <div
                            className="h-full bg-[#00D395] transition-all duration-500"
                            style={{ width: `${compoundPercent}%` }}
                            title={`Compound: ${compoundPercent}%`}
                        />
                    )}
                    {aavePercent === 0 && compoundPercent === 0 && (
                        <div className="h-full bg-brand-green/50 w-full" />
                    )}
                </div>
                <div className="flex justify-between mt-2 text-xs font-semibold">
                    <span className="text-[#B6509E]">Aave {aavePercent.toFixed(1)}%</span>
                    <span className="text-[#00D395]">Compound {compoundPercent.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}
