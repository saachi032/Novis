import { StatsBalanceCards } from "@/components/StatsBalanceCards";
import { DepositWithdrawPanel } from "@/components/DepositWithdrawPanel";

export default function BuyPage() {
    return (
        <>
            <StatsBalanceCards />
            <section className="px-4 pb-16 sm:px-6 sm:pb-24">
                <div className="mx-auto max-w-xl">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
                        Buy
                    </p>
                    <h1 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
                        Deposit USDC
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-neutral-600">
                        Deposit USDC into the vault to mint shares. Your funds are
                        automatically allocated across Aave v3 and Compound v3 for optimized
                        yield.
                    </p>
                    <div className="mt-10">
                        <DepositWithdrawPanel defaultTab="deposit" />
                    </div>
                </div>
            </section>
        </>
    );
}
