import { HeroSection } from "@/components/HeroSection";
import { StatsBalanceCards } from "@/components/StatsBalanceCards";
import { CandleChart } from "@/components/CandleChart";
import { ConversionTicker } from "@/components/ConversionTicker";
import { YieldCard } from "@/components/YieldCard";
import { Suspense } from "react";

export default function Home() {
    return (
        <>
            <HeroSection />
            <StatsBalanceCards />

            <section className="container mx-auto px-4 py-12 max-w-7xl">
                <div className="mb-8">
                    <h2 className="text-3xl font-display font-bold mb-6">Vault Dashboard</h2>
                    <div className="w-full mb-8">
                        <CandleChart height={400} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="w-full">
                            <Suspense fallback={<div className="surface-card flex h-32 animate-pulse bg-brand-gray/20" />}>
                                <ConversionTicker />
                            </Suspense>
                        </div>
                        <div className="w-full">
                            <Suspense fallback={<div className="surface-card p-6 min-h-[300px] animate-pulse bg-brand-gray/20" />}>
                                <YieldCard />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
