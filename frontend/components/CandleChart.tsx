"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, Time } from "lightweight-charts";

interface CandleChartProps {
    initialSymbol?: string;
    interval?: string;
    height?: number;
}

const AVAILABLE_ASSETS = [
    { label: "ETH", value: "ETHUSDT" },
    { label: "BTC", value: "BTCUSDT" },
    { label: "POL (MATIC)", value: "MATICUSDT" },
    { label: "SOL", value: "SOLUSDT" },
];

export function CandleChart({
    initialSymbol = "ETHUSDT",
    interval = "1h",
    height = 300,
}: CandleChartProps) {
    const [symbol, setSymbol] = useState(initialSymbol);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        let isMounted = true;
        let pollInterval: NodeJS.Timeout;

        const initChart = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch initial data
                const res = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`
                );
                if (!res.ok) throw new Error("Failed to fetch chart data");
                const data = await res.json();

                const formattedData = data.map((d: unknown[]) => ({
                    time: (Number(d[0]) / 1000) as Time,
                    open: parseFloat(String(d[1])),
                    high: parseFloat(String(d[2])),
                    low: parseFloat(String(d[3])),
                    close: parseFloat(String(d[4])),
                }));

                if (!isMounted) return;

                if (chartContainerRef.current) {
                    const chart = createChart(chartContainerRef.current, {
                        layout: {
                            background: { color: "#0f172a" },
                            textColor: "#d1d5db",
                        },
                        grid: {
                            vertLines: { color: "#334155" },
                            horzLines: { color: "#334155" },
                        },
                        width: chartContainerRef.current.clientWidth,
                        height: height,
                    });

                    const candlestickSeries = chart.addSeries(CandlestickSeries, {
                        upColor: "#22c55e",
                        downColor: "#ef4444",
                        borderVisible: false,
                        wickUpColor: "#22c55e",
                        wickDownColor: "#ef4444",
                    });

                    candlestickSeries.setData(formattedData);

                    chartRef.current = chart;
                    seriesRef.current = candlestickSeries;

                    chart.timeScale().fitContent();

                    // Handle resize
                    const handleResize = () => {
                        if (chartContainerRef.current && chartRef.current) {
                            chartRef.current.applyOptions({
                                width: chartContainerRef.current.clientWidth,
                            });
                        }
                    };

                    const resizeObserver = new ResizeObserver(handleResize);
                    resizeObserver.observe(chartContainerRef.current);

                    setIsLoading(false);

                    // Setup polling
                    pollInterval = setInterval(async () => {
                        try {
                            const pollRes = await fetch(
                                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1`
                            );
                            if (!pollRes.ok) return;
                            const pollData = await pollRes.json();
                            if (pollData.length > 0 && seriesRef.current) {
                                const latest = pollData[0];
                                seriesRef.current.update({
                                    time: (latest[0] / 1000) as Time,
                                    open: parseFloat(latest[1]),
                                    high: parseFloat(latest[2]),
                                    low: parseFloat(latest[3]),
                                    close: parseFloat(latest[4]),
                                });
                            }
                        } catch (e) {
                            console.error("Polling error", e);
                        }
                    }, 30000);

                    return () => {
                        resizeObserver.disconnect();
                    };
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : "Something went wrong";
                    setError(message);
                    setIsLoading(false);
                }
            }
        };

        initChart();

        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [symbol, interval, height]);

    if (error) {
        return (
            <div
                className="flex items-center justify-center rounded-2xl bg-[#0f172a] text-red-400"
                style={{ height }}
            >
                <p>Error loading chart: {error}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#0f172a] shadow-card flex flex-col">
            <div className="absolute top-4 left-4 z-20 flex space-x-2">
                {AVAILABLE_ASSETS.map((asset) => (
                    <button
                        key={asset.value}
                        onClick={() => setSymbol(asset.value)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${symbol === asset.value
                                ? "bg-brand-green text-white"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                    >
                        {asset.label}
                    </button>
                ))}
            </div>

            {isLoading && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f172a]"
                    style={{ height }}
                >
                    <div className="h-full w-full animate-pulse bg-brand-gray/10" />
                </div>
            )}
            <div ref={chartContainerRef} className="w-full mt-4" />
        </div>
    );
}
