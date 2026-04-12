import { BacktestSimulator } from "@/components/BacktestSimulator";

export default function BacktestPage() {
  return (
    <div className="bg-gradient-to-b from-[#030712] to-[#0f172a]">
      <section className="container mx-auto py-12 px-4">
        <div className="mx-auto max-w-5xl space-y-4 text-center text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-green">On-chain simulation</p>
          <h1 className="text-4xl font-bold sm:text-5xl">DeFi yield optimizer backtest</h1>
          <p className="text-base text-white/70">
            Uses the full <code>defiyeildpool.json</code> manifest for Aave v3, Compound v3, and Morpho USDC pools,
            pulls historical APY from DefiLlama, and runs the same gas-aware switching rules as the Python backtest.
          </p>
        </div>

        <div className="mt-10">
          <BacktestSimulator initialCapital={1000} />
        </div>
      </section>
    </div>
  );
}
