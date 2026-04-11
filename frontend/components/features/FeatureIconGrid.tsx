const ITEMS = [
  {
    title: "ERC-4626 vault",
    body: "Standard share accounting; deposit USDC, receive vault shares.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    title: "Dual venues",
    body: "Aave v3 & Compound v3 on Base; live supply APY drives allocation.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
      </svg>
    ),
  },
  {
    title: "Gas-aware rebalance",
    body: "Moves capital only when spread clears threshold and yield beats gas.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Chainlink Automation",
    body: "Upkeep-compatible executor with owner manual fallback if needed.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Risk registry",
    body: "Conservative, balanced, or aggressive constraints per wallet.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Transparent fees",
    body: "0.5% performance fee on yield only — not on principal.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function FeatureIconGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.map((item) => (
        <div
          key={item.title}
          className="surface-card flex h-full min-h-[12rem] gap-4 p-5 transition duration-300 hover:scale-[1.01]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-gray/80 bg-brand-bg text-brand-green">
            {item.icon}
          </div>
          <div className="flex min-h-full flex-col justify-between">
            <h3 className="text-sm font-bold text-brand-black">{item.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              {item.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
