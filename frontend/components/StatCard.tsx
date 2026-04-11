type StatState = "idle" | "loading" | "error";

export function StatCard({
  label,
  value,
  sub,
  state = "idle",
}: {
  label: string;
  value: string;
  sub?: string;
  state?: StatState;
}) {
  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {state === "loading" ? (
        <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-brand-gray/60" />
      ) : state === "error" ? (
        <p className="mt-3 text-sm text-red-700">Unable to load</p>
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tracking-tight text-brand-black">
          {value}
        </p>
      )}
      {sub && state === "idle" && (
        <p className="mt-1 text-xs text-neutral-500">{sub}</p>
      )}
    </div>
  );
}
