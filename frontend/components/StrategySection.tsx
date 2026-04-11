export function StrategySection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden border-t border-brand-gray/50 bg-white px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="pointer-events-none absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-gray/35" />

      <div className="relative mx-auto max-w-3xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">
          Features
        </p>
        <h2 className="mt-4 text-center font-display text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl md:text-5xl">
          How novis routes your USDC
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-center text-sm leading-relaxed text-neutral-600 sm:text-base">
          Deposits flow into an ERC-4626 vault on Base. A strategy router reads
          Aave v3 and Compound v3 supply rates, normalizes APYs, and sizes
          allocation. A Chainlink-compatible rebalancer moves capital only when
          the spread clears your threshold, expected yield beats gas, and the
          cooldown has elapsed — so you keep more of what the protocols pay.
        </p>
        <ul className="mx-auto mt-12 max-w-xl space-y-4 text-left text-sm text-neutral-600">
          <li className="flex gap-4">
            <span className="font-display text-lg font-bold text-brand-green">
              01
            </span>
            <span>
              <strong className="text-brand-black">Deposit:</strong> USDC in,
              shares out; funds split per live allocation.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-lg font-bold text-brand-green">
              02
            </span>
            <span>
              <strong className="text-brand-black">Monitor:</strong> blended APY
              and per-protocol rates update from on-chain reads.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-lg font-bold text-brand-green">
              03
            </span>
            <span>
              <strong className="text-brand-black">Rebalance:</strong> automated
              moves from lower to higher APY when economics justify the tx.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-lg font-bold text-brand-green">
              04
            </span>
            <span>
              <strong className="text-brand-black">Withdraw:</strong> burn shares
              anytime; router redeems from underlying venues.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
