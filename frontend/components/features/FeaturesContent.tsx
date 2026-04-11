import { Suspense } from "react";
import { DotYieldChart } from "@/components/DotYieldChart";
import { StrategySection } from "@/components/StrategySection";
import { CandleChart } from "@/components/CandleChart";
import { ConversionTicker } from "@/components/ConversionTicker";
import { FeatureIconGrid } from "@/components/features/FeatureIconGrid";
import { StablecoinPegPanel } from "@/components/features/StablecoinPegPanel";

export function FeaturesContent() {
  return (
    <div className="px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
          Features
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl md:text-5xl">
          What Novis provides
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-neutral-600 sm:text-base">
          Automated USDC yield on Base across Aave and Compound, with clear
          telemetry, stablecoin context, and live reference markets — all in one
          editorial layout.
        </p>

        <div className="mt-14">
          <FeatureIconGrid />
        </div>

        <div className="mt-16">
          <h2 className="font-display text-xl font-bold text-brand-black sm:text-2xl">
            Vault performance (live demo)
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Daily vault earnings visualization. Dots stack by day; interact to
            inspect values. Wired to contract reads when deployed.
          </p>
          <div className="mt-6">
            <DotYieldChart />
          </div>
        </div>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-2">
          <StablecoinPegPanel />
          <div className="flex h-full flex-col space-y-6">
            <Suspense
              fallback={
                <div className="surface-card flex min-h-[20rem] h-full items-center justify-center bg-brand-gray/20" />
              }
            >
              <ConversionTicker />
            </Suspense>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-display text-xl font-bold text-brand-black sm:text-2xl">
            Reference markets (real-time candles)
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Cross-check macro liquidity and volatility alongside stable routes.
            Switch asset from the chart toolbar.
          </p>
          <div className="mt-6">
            <CandleChart height={360} variant="light" initialSymbol="USDCUSDT" />
          </div>
        </div>

        <div className="mt-20 border-t border-brand-gray/50 pt-16">
          <StrategySection embedded />
        </div>
      </div>
    </div>
  );
}
