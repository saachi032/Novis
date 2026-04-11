const rows = [
  {
    when: "Apr 8, 2026 · 14:32 UTC",
    from: "Aave v3",
    to: "Compound v3",
    amount: "$124,500",
    reason: "APY gap > 3%, net-positive vs gas",
  },
  {
    when: "Apr 7, 2026 · 09:05 UTC",
    from: "Compound v3",
    to: "Aave v3",
    amount: "$98,200",
    reason: "Cooldown elapsed; spread narrowed",
  },
  {
    when: "Apr 5, 2026 · 18:41 UTC",
    from: "Aave v3",
    to: "Compound v3",
    amount: "$210,000",
    reason: "Rate inversion on Compound",
  },
];

export function RebalanceTable() {
  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-brand-black">
          Rebalance history
        </h3>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-gray bg-brand-bg px-3 py-1 text-[10px] font-semibold text-brand-green">
          <span
            className="h-1.5 w-1.5 rounded-full bg-brand-green"
            aria-hidden
          />
          Automation nominal (Chainlink)
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Latest on-chain events (illustrative until contracts are wired).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-brand-gray/80 text-neutral-500">
              <th className="pb-2 pr-4 font-semibold">Time</th>
              <th className="pb-2 pr-4 font-semibold">From</th>
              <th className="pb-2 pr-4 font-semibold">To</th>
              <th className="pb-2 pr-4 font-semibold">Notional</th>
              <th className="pb-2 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="text-neutral-700">
            {rows.map((r) => (
              <tr key={r.when} className="border-b border-brand-gray/40">
                <td className="py-3 pr-4 text-neutral-500">{r.when}</td>
                <td className="py-3 pr-4">{r.from}</td>
                <td className="py-3 pr-4">{r.to}</td>
                <td className="py-3 pr-4 font-mono text-sm text-brand-black">
                  {r.amount}
                </td>
                <td className="py-3 text-neutral-500">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
