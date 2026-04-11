"use client";

import { useReadContract, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";


const CHAINLINK_ABI = [
    {
        inputs: [],
        name: "latestRoundData",
        outputs: [
            { name: "roundId", type: "uint80" },
            { name: "answer", type: "int256" },
            { name: "startedAt", type: "uint256" },
            { name: "updatedAt", type: "uint256" },
            { name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;

export function ConversionTicker() {
    const chainId = useChainId();
    const address = chainId === base.id ? "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" : "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";

    const [prevPrice, setPrevPrice] = useState<number | null>(null);
    const [isUp, setIsUp] = useState<boolean | null>(null);

    const { data, isError, isLoading, dataUpdatedAt, error } = useReadContract({
        address,
        abi: CHAINLINK_ABI,
        functionName: "latestRoundData",
        query: {
            refetchInterval: 10000,
        },
    });

    const rawAnswer = data?.[1] ? BigInt(data[1].toString()) : undefined;
    const currentPrice = rawAnswer ? Number(formatUnits(rawAnswer, 8)) : null;
    const usdcEthRate = currentPrice ? 1 / currentPrice : null;

    useEffect(() => {
        if (currentPrice) {
            if (prevPrice !== null) {
                if (currentPrice > prevPrice) setIsUp(true);
                else if (currentPrice < prevPrice) setIsUp(false);
            }
            setPrevPrice(currentPrice);
        }
    }, [currentPrice, prevPrice]);

    const [altPrices, setAltPrices] = useState<Record<string, number>>({});

    useEffect(() => {
        let isMounted = true;
        const fetchAltPrices = async () => {
            try {
                const symbols = encodeURIComponent('["BTCUSDT","MATICUSDT","SOLUSDT","POLUSDT"]');
                const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbols}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!isMounted) return;
                const prices: Record<string, number> = {};
                data.forEach((item: { symbol: string; price: string }) => {
                    if (item.symbol === "BTCUSDT") prices.BTC = parseFloat(item.price);
                    if (item.symbol === "MATICUSDT" && !prices.POL) prices.POL = parseFloat(item.price);
                    if (item.symbol === "POLUSDT") prices.POL = parseFloat(item.price);
                    if (item.symbol === "SOLUSDT") prices.SOL = parseFloat(item.price);
                });
                setAltPrices(prices);
            } catch (err) {
                console.error("Failed to fetch alt prices:", err);
            }
        };
        fetchAltPrices();
        const interval = setInterval(fetchAltPrices, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const timeAgo = dataUpdatedAt
        ? Math.floor((Date.now() - dataUpdatedAt) / 1000)
        : 0;

    if (isLoading) {
        return (
            <div className="surface-card flex h-32 animate-pulse items-center justify-center p-6 bg-brand-gray/20">
                <div className="h-6 w-32 rounded bg-brand-gray/40" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="surface-card flex h-32 items-center justify-center p-6 text-red-500 text-sm text-center">
                Error loading rates: {error?.message.slice(0, 30)}...
            </div>
        );
    }

    return (
        <div className="surface-card p-6 flex flex-col justify-center space-y-4 relative">
            <div className="absolute top-4 right-4 flex items-center space-x-2 text-xs text-brand-black/50">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <span>Live</span>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-brand-black/60 uppercase tracking-wider mb-1">
                    ETH/USD Oracle
                </h3>
                <div className="flex items-center space-x-2">
                    <span className="text-3xl font-display font-bold">
                        {currentPrice
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                            }).format(currentPrice)
                            : "—"}
                    </span>
                    {isUp !== null && (
                        <span
                            className={`flex items-center text-lg ${isUp ? "text-green-500" : "text-red-500"
                                }`}
                        >
                            {isUp ? "↑" : "↓"}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-brand-gray/30 pt-3 pb-3">
                <div className="text-sm text-brand-black/80 font-medium">
                    1 USDC = {usdcEthRate ? usdcEthRate.toFixed(6) : "—"} ETH
                </div>
                <div className="text-xs text-brand-black/40">
                    Updated {timeAgo}s ago
                </div>
            </div>

            {/* Alt Rates Grid */}
            <div className="grid grid-cols-3 gap-2 border-t border-brand-gray/30 pt-3">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-brand-black/50 font-bold">BTC/USD</span>
                    <span className="text-sm font-semibold">{altPrices.BTC ? `$${altPrices.BTC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-brand-black/50 font-bold">POL/USD</span>
                    <span className="text-sm font-semibold">{altPrices.POL ? `$${altPrices.POL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-brand-black/50 font-bold">SOL/USD</span>
                    <span className="text-sm font-semibold">{altPrices.SOL ? `$${altPrices.SOL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
                </div>
            </div>
        </div>
    );
}
