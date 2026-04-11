import { BacktestSimulator } from "@/components/BacktestSimulator";

export default function BacktestPage() {
  return (
    <div className="bg-gradient-to-b from-[#030712] to-[#0f172a]">
      <section className="container mx-auto py-12 px-4">
        <div className="mx-auto max-w-5xl space-y-4 text-center text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-green">On-chain simulation</p>
          <h1 className="text-4xl font-bold sm:text-5xl">DeFi yield optimizer backtest</h1>
          <p className="text-base text-white/70">
            Uses the full <code>defiyeildpool.json</code> manifest to surface Aave v3 and Morpho v1 USDC pools
            and run a gas-aware switching strategy. Drop in any initial capital and compare passive versus
            automated performance over a 30-day simulation.
          </p>
        </div>

        <div className="mt-10">
          <BacktestSimulator initialCapital={1000} />
        </div>
      </section>
    </div>
  );
}
