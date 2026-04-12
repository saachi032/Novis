"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  Time,
} from "lightweight-charts";

interface CandleChartProps {
  initialSymbol?: string;
  interval?: string;
  height?: number;
  variant?: "dark" | "light";
}

const AVAILABLE_ASSETS = [
  { label: "USDC", value: "USDCUSDT" },
  { label: "ETH", value: "ETHUSDT" },
  { label: "BTC", value: "BTCUSDT" },
  { label: "POL", value: "MATICUSDT" },
  { label: "SOL", value: "SOLUSDT" },
];

const PASTEL_UP = "#A8D5BA";
const PASTEL_DOWN = "#F0B7B3";
const PASTEL_NEUTRAL = "#E8E1D9";
const PASTEL_GUIDE = "#557571";
const HISTORY_LIMIT = 500;

type DotColumn = {
  level: number;
  tone: "up" | "down";
  ratio: number;
  label: string;
  openLevel: number;
  closeLevel: number;
};

type CandleDatum = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function CandleChart({
  initialSymbol = "ETHUSDT",
  interval = "1h",
  height = 340,
  variant = "dark",
}: CandleChartProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dotColumns, setDotColumns] = useState<DotColumn[]>([]);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const isLight = variant === "light";

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let currentData: CandleDatum[] = [];

    const updateDots = (data: CandleDatum[]) => {
      const sampledDots = data
        .slice(-12)
        .map((entry, index, arr) => {
          const localMin = Math.min(...arr.map((item) => item.low));
          const localMax = Math.max(...arr.map((item) => item.high));
          const span = Math.max(localMax - localMin, 0.0001);
          const normalized = (entry.close - localMin) / span;
          const openNormalized = (entry.open - localMin) / span;
          const maxNormalized = Math.max(normalized, openNormalized);
          return {
            level: Math.max(4, Math.round(maxNormalized * 8) + 2),
            tone: entry.close >= entry.open ? "up" : "down",
            ratio: normalized,
            label: `${index + 1}`,
            openLevel: Math.max(1, Math.round(openNormalized * 8) + 1),
            closeLevel: Math.max(1, Math.round(normalized * 8) + 1),
          } satisfies DotColumn;
        });
      setDotColumns(sampledDots);
    };

    const run = async () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${HISTORY_LIMIT}`
        );
        if (!res.ok) throw new Error("Failed to fetch chart data");
        const data = await res.json();

        const formattedData: CandleDatum[] = data.map((d: unknown[]) => ({
          time: (Number(d[0]) / 1000) as Time,
          open: parseFloat(String(d[1])),
          high: parseFloat(String(d[2])),
          low: parseFloat(String(d[3])),
          close: parseFloat(String(d[4])),
        }));

        currentData = formattedData;
        updateDots(currentData);

        if (cancelled || !chartContainerRef.current) return;

        const bg = isLight ? "#ffffff" : "#0f172a";
        const text = isLight ? "#404040" : "#d1d5db";
        const grid = isLight ? "#e5e5e5" : "#334155";

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { color: bg },
            textColor: text,
          },
          grid: {
            vertLines: { color: grid },
            horzLines: { color: grid },
          },
          timeScale: {
            rightOffset: 0,
            fixLeftEdge: true,
            fixRightEdge: true,
            lockVisibleTimeRangeOnResize: true,
            rightBarStaysOnScroll: true,
            minBarSpacing: 0.6,
            borderVisible: false,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            mouseWheel: true,
            pinch: true,
            axisPressedMouseMove: true,
          },
          width: chartContainerRef.current.clientWidth,
          height,
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: isLight ? PASTEL_UP : "#22c55e",
          downColor: isLight ? PASTEL_DOWN : "#ef4444",
          borderUpColor: isLight ? "#7ab494" : "#22c55e",
          borderDownColor: isLight ? "#d78f87" : "#ef4444",
          wickUpColor: isLight ? "#7ab494" : "#22c55e",
          wickDownColor: isLight ? "#d78f87" : "#ef4444",
        });

        candlestickSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        const ro = new ResizeObserver(() => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        });
        ro.observe(chartContainerRef.current);
        resizeObserver = ro;

        const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const kline = message.k;
            if (!kline || !seriesRef.current) return;

            const candle: CandleDatum = {
              time: (kline.t / 1000) as Time,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
            };

            seriesRef.current.update(candle);

            if (currentData.length > 0) {
              const lastCandle = currentData[currentData.length - 1];
              if (lastCandle.time === candle.time) {
                currentData[currentData.length - 1] = candle;
              } else {
                currentData.push(candle);
              }
              updateDots(currentData);
            }
          } catch (e) {
            console.error("WebSocket message parsing error", e);
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            console.log("WebSocket closed");
          }
        };

        ws.onerror = (e) => {
          console.error("WebSocket error", e);
        };

        setIsLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Something went wrong";
          setError(message);
          setDotColumns([]);
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (ws) {
        ws.close();
      }
      resizeObserver?.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [symbol, interval, height, isLight]);

  const shellBg = isLight
    ? "bg-white border border-brand-gray/70"
    : "bg-[#0f172a]";
  const loadBg = isLight ? "bg-white" : "bg-[#0f172a]";
  const btnActive = "bg-brand-green text-white";
  const btnIdle = isLight
    ? "bg-brand-bg text-brand-black border border-brand-gray/80 hover:bg-white"
    : "bg-white/10 text-white/60 hover:bg-white/20";
  const overlayBg = isLight
    ? "bg-white/92 border border-brand-gray/70"
    : "bg-slate-900/80 border border-white/10";
  const overlayText = isLight ? "text-neutral-500" : "text-slate-300";
  const overlayHeading = isLight ? "text-neutral-500" : "text-slate-200";

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl ${shellBg} p-8 text-sm text-red-600`}
        style={{ minHeight: height }}
      >
        <p>Error loading chart: {error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl shadow-card ${shellBg}`}
    >
      <div className="flex flex-wrap gap-2 border-b border-brand-gray/60 px-4 pb-4 pt-4 sm:px-6">
        {AVAILABLE_ASSETS.map((asset) => (
          <button
            key={asset.value}
            type="button"
            onClick={() => setSymbol(asset.value)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${symbol === asset.value ? btnActive : btnIdle
              }`}
          >
            {asset.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div
          className={`absolute inset-x-0 top-[65px] z-10 flex items-center justify-center ${loadBg}`}
          style={{ minHeight: height }}
        >
          <div className="h-full w-full animate-pulse bg-brand-gray/20" />
        </div>
      )}
      <div
        ref={chartContainerRef}
        className="w-full px-2 pt-2 sm:px-4 sm:pt-4"
        style={{ height }}
      />

      {dotColumns.length > 0 ? (
        <div
          className={`border-t border-brand-gray/60 px-4 py-4 sm:px-6 sm:py-5 ${overlayBg}`}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${overlayHeading}`}
              >
                Pastel candle pulse
              </p>
              <p className={`mt-1 text-[11px] ${overlayText}`}>
                Green and red markers mirror recent candle direction.
              </p>
            </div>
            <div className={`flex items-center gap-3 text-[10px] font-medium ${overlayText}`}>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PASTEL_UP }}
                />
                Up
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PASTEL_DOWN }}
                />
                Down
              </span>
            </div>
          </div>
          <div className="flex h-24 items-end justify-between gap-1 overflow-hidden sm:h-28 sm:gap-1.5">
            {dotColumns.map((column) => {
              const accent =
                column.tone === "up" ? PASTEL_UP : PASTEL_DOWN;
              const lineTop = Math.max(column.openLevel, column.closeLevel);
              const lineBottom = Math.min(column.openLevel, column.closeLevel);
              return (
                <div
                  key={`${symbol}-${column.label}`}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <div className="relative flex flex-col-reverse items-center gap-1">
                    <span
                      className="absolute left-1/2 w-px -translate-x-1/2 rounded-full"
                      style={{
                        backgroundColor: PASTEL_GUIDE,
                        bottom: `${(lineBottom - 1) * 14}px`,
                        height: `${Math.max(12, (lineTop - lineBottom) * 14)}px`,
                        opacity: 0.35,
                      }}
                    />
                    {Array.from({ length: column.level }).map((_, index) => {
                      const isAccent = index === column.level - 1;
                      const isPriceBand =
                        index + 1 >= lineBottom && index + 1 <= lineTop;
                      return (
                        <span
                          key={index}
                          className="block h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3"
                          style={{
                            backgroundColor:
                              isAccent || isPriceBand ? accent : PASTEL_NEUTRAL,
                            boxShadow:
                              isAccent || isPriceBand
                                ? `0 0 0 2px ${isLight ? "#ffffff" : "#0f172a"}`
                                : "none",
                            opacity:
                              isAccent || isPriceBand
                                ? 1
                                : 0.92 - column.ratio * 0.18,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-[9px] font-medium sm:text-[10px] ${overlayText}`}>
                    {column.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
