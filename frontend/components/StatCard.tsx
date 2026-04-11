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
    <div className="surface-card relative overflow-hidden flex h-full min-h-[10.5rem] flex-col justify-between p-5 transition duration-300 hover:scale-[1.01] hover:shadow-lg">
      {/* Subtle gradient background accent */}
      <div className="absolute inset-0 opacity-0 hover:opacity-5 bg-gradient-to-br from-brand-green to-transparent transition-opacity" />
      
      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          {label}
        </p>
        {state === "loading" ? (
          <div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-brand-gray/60" />
        ) : state === "error" ? (
          <p className="mt-3 text-sm text-red-700">Unable to load</p>
        ) : (
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-black leading-none">
            {value}
          </p>
        )}
      </div>
      
      {sub && state === "idle" && (
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
          {sub}
        </p>
      )}
    </div>
  );
}
