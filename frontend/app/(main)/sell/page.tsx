import { StatsBalanceCards } from "@/components/StatsBalanceCards";
import { StablecoinBalancesStrip } from "@/components/StablecoinBalancesStrip";
import { DepositWithdrawPanel } from "@/components/DepositWithdrawPanel";

export default function SellPage() {
    return (
        <>
            <div className="pt-8 sm:pt-12">
                <StatsBalanceCards />
            </div>
            <section className="px-4 pb-16 sm:px-6 sm:pb-24">
                <div className="mx-auto max-w-xl">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                        Sell &amp; Trade
                    </p>
                    <h1 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
                        Withdraw (USDC)
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-neutral-600">
                        Redeem vault shares for <strong className="font-semibold text-brand-black">USDC</strong>{" "}
                        (the vault&apos;s underlying asset). The router pulls liquidity from
                        Aave and Compound automatically. If you want another stablecoin after
                        withdrawing, swap on your favorite DEX.
                    </p>
                    <div className="mx-auto mt-8 max-w-xl">
                        <StablecoinBalancesStrip />
                    </div>
                    <div className="mt-10">
                        <DepositWithdrawPanel variant="withdraw-only" />
                    </div>
                </div>
            </section>
        </>
    );
}
