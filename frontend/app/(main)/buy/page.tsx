import { StatsBalanceCards } from "@/components/StatsBalanceCards";
import { StablecoinBalancesStrip } from "@/components/StablecoinBalancesStrip";
import { DepositWithdrawPanel } from "@/components/DepositWithdrawPanel";

export default function BuyPage() {
    return (
        <>
            <div className="pt-8 sm:pt-12">
                <StatsBalanceCards />
            </div>
            <section className="px-4 pb-16 sm:px-6 sm:pb-24">
                <div className="mx-auto max-w-xl">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                        Buy
                    </p>
                    <h1 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
                        Deposit stablecoins
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-neutral-600">
                        Deposit USDC into the vault to mint shares. The current deployment is
                        USDC-only, so the live flow is simpler and easier to verify. Funds are
                        allocated across the supported strategy path and shown in USD terms.
                    </p>
                    <div className="mx-auto mt-8 max-w-xl">
                        <StablecoinBalancesStrip selectOnClick />
                    </div>
                    <div className="mt-10">
                        <DepositWithdrawPanel variant="deposit-only" />
                    </div>
                </div>
            </section>
        </>
    );
}
