export function StrategySection({ embedded = false }: { embedded?: boolean }) {
  return (
    <section
      id={embedded ? undefined : "features"}
      className={`relative overflow-hidden bg-white px-4 sm:px-6 ${embedded ? "py-0" : "border-t border-brand-gray/50 py-20 sm:py-28"}`}
    >
      <div className="pointer-events-none absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-gray/35" />

      <div className="relative mx-auto max-w-5xl">
        {!embedded ? (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
            Features
          </p>
        ) : null}
        <h2
          className={`text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl md:text-5xl ${embedded ? "" : "mt-4"}`}
        >
          How novis routes your USDC
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-sm leading-relaxed text-neutral-600 sm:text-base">
          Deposits flow into an ERC-4626 vault on Base. A strategy router reads
          Aave v3 and Compound v3 supply rates, normalizes APYs, and sizes
          allocation. A Chainlink-compatible rebalancer moves capital only when
          the spread clears your threshold, expected yield beats gas, and the
          cooldown has elapsed — so you keep more of what the protocols pay.
        </p>
        <ul className="mx-auto mt-12 grid max-w-5xl gap-5 text-left text-sm text-neutral-600 sm:grid-cols-2">
          <li className="surface-card flex min-h-[12rem] flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-brand-green">
                01
              </span>
              <span className="rounded-full border border-brand-gray/70 bg-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Entry
              </span>
            </div>
            <span className="max-w-sm text-sm leading-relaxed">
              <strong className="text-brand-black">Deposit:</strong> USDC in,
              shares out; funds split per live allocation.
            </span>
          </li>
          <li className="surface-card flex min-h-[12rem] flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-brand-green">
                02
              </span>
              <span className="rounded-full border border-brand-gray/70 bg-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Monitor
              </span>
            </div>
            <span className="max-w-sm text-sm leading-relaxed">
              <strong className="text-brand-black">Monitor:</strong> blended APY
              and per-protocol rates update from on-chain reads.
            </span>
          </li>
          <li className="surface-card flex min-h-[12rem] flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-brand-green">
                03
              </span>
              <span className="rounded-full border border-brand-gray/70 bg-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Move
              </span>
            </div>
            <span className="max-w-sm text-sm leading-relaxed">
              <strong className="text-brand-black">Rebalance:</strong> automated
              moves from lower to higher APY when economics justify the tx.
            </span>
          </li>
          <li className="surface-card flex min-h-[12rem] flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-brand-green">
                04
              </span>
              <span className="rounded-full border border-brand-gray/70 bg-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Exit
              </span>
            </div>
            <span className="max-w-sm text-sm leading-relaxed">
              <strong className="text-brand-black">Withdraw:</strong> burn shares
              anytime; router redeems from underlying venues.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
