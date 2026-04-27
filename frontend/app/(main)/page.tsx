import Link from "next/link";
import { HeroSection } from "@/components/HeroSection";
import { StatsBalanceCards } from "@/components/StatsBalanceCards";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsBalanceCards />
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-2 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/features"
            className="surface-card group flex flex-col justify-between p-6 transition duration-300 hover:scale-[1.02]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                Features
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-brand-black">
                Charts &amp; stablecoin telemetry
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Vault earnings graph, peg panel, live oracle rates, and candle
                markets — styled for Novis.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-brand-green group-hover:underline">
              View features →
            </span>
          </Link>
          <Link
            href="/marketplace"
            className="surface-card group flex flex-col justify-between p-6 transition duration-300 hover:scale-[1.02]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                Marketplace
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-brand-black">
                Portfolio &amp; yield
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Your investments, returns, and drill-down charts. Deposit or
                withdraw from Buy / Sell &amp; Trade.
              </p>
            </div>
            <span className="mt-4 text-sm font-semibold text-brand-green group-hover:underline">
              Open marketplace →
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
