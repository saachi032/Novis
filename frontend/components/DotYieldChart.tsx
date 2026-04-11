"use client";

import { useLayoutEffect, useRef, useState } from "react";

const DOLLAR_PER_DOT = 20;
const MAX_Y = 300;
const MAX_DOTS = MAX_Y / DOLLAR_PER_DOT;

const DOT_DEFAULT = "#D9D9D9";
const ACCENT = "#557571";

function marchDemoValues(): number[] {
  const out: number[] = [];
  for (let d = 0; d < 31; d++) {
    const t = Math.sin(d * 1.7 + 2) * 80 + 140 + (d % 7) * 8;
    out.push(Math.min(MAX_Y, Math.max(0, Math.round(t))));
  }
  out[13] = 220;
  return out;
}

const LABEL_DAYS = [1, 5, 10, 15, 20, 25, 31];

export function DotYieldChart() {
  const values = useRef(marchDemoValues()).current;
  const [selected, setSelected] = useState(13);
  const wrapRef = useRef<HTMLDivElement>(null);
  const yPillRef = useRef<HTMLDivElement>(null);
  const topDotRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const selectedValue = values[selected];
  const yTicks = [0, 100, 200, 300];

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const pill = yPillRef.current;
    const dot = topDotRef.current;
    if (!wrap || !pill || !dot) {
      setLine(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const pr = pill.getBoundingClientRect();
    const dr = dot.getBoundingClientRect();
    const y = (dr.top + dr.bottom) / 2 - wr.top;
    const x1 = pr.right - wr.left;
    const x2 = (dr.left + dr.right) / 2 - wr.left;
    setLine({ x1, y1: y, x2, y2: y });
  }, [selected, selectedValue]);

  return (
    <div className="surface-card w-full p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-sm font-semibold text-brand-black">
          Daily vault earnings
        </h3>
        <p className="text-xs text-neutral-500">
          Each dot = ${DOLLAR_PER_DOT} · March snapshot (demo)
        </p>
      </div>

      <div ref={wrapRef} className="relative flex gap-2 sm:gap-3">
        {line && (
          <svg
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
            aria-hidden
          >
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={ACCENT}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle cx={line.x1} cy={line.y1} r={3} fill={ACCENT} />
            <circle cx={line.x2} cy={line.y2} r={3} fill={ACCENT} />
          </svg>
        )}

        <div className="relative flex w-11 shrink-0 flex-col justify-between pt-1 pb-8 text-right">
          {yTicks
            .slice()
            .reverse()
            .map((v) => (
              <span
                key={v}
                className="text-[11px] leading-none text-neutral-400 sm:text-xs"
              >
                {v === 0 ? "0" : `$${v}`}
              </span>
            ))}
          <div
            ref={yPillRef}
            className="pointer-events-none absolute right-0 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white sm:text-xs"
            style={{
              backgroundColor: ACCENT,
              top: line ? line.y1 - 10 : "50%",
            }}
          >
            ${selectedValue}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-52 items-end justify-between gap-0.5 px-0.5 sm:h-56 sm:gap-px">
            {values.map((value, dayIndex) => {
              const n = Math.min(
                MAX_DOTS,
                Math.max(0, Math.round(value / DOLLAR_PER_DOT))
              );
              const isSel = dayIndex === selected;
              const fill = isSel ? ACCENT : DOT_DEFAULT;
              return (
                <button
                  key={dayIndex}
                  type="button"
                  aria-label={`March ${dayIndex + 1}, $${value}`}
                  aria-pressed={isSel}
                  className="group flex min-w-0 flex-1 flex-col-reverse items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                  onMouseEnter={() => setSelected(dayIndex)}
                  onFocus={() => setSelected(dayIndex)}
                  onClick={() => setSelected(dayIndex)}
                >
                  {Array.from({ length: n }).map((_, i) => {
                    const isTop = i === n - 1;
                    return (
                      <div
                        key={i}
                        ref={isTop && isSel ? topDotRef : undefined}
                        className="aspect-square w-[55%] max-w-[9px] shrink-0 rounded-full sm:max-w-[10px]"
                        style={{ backgroundColor: fill }}
                      />
                    );
                  })}
                </button>
              );
            })}
          </div>

          <div className="relative mt-2 flex justify-between px-0.5 text-[9px] text-neutral-400 sm:text-[10px]">
            {values.map((_, dayIndex) => {
              const domDay = dayIndex + 1;
              const show = LABEL_DAYS.includes(domDay);
              const isSel = dayIndex === selected;
              return (
                <div
                  key={dayIndex}
                  className="flex min-w-0 flex-1 justify-center"
                >
                  {show ? (
                    <span
                      className={
                        isSel
                          ? "rounded-full px-1.5 py-0.5 font-semibold text-white sm:px-2"
                          : ""
                      }
                      style={isSel ? { backgroundColor: ACCENT } : undefined}
                    >
                      Mar {domDay}
                    </span>
                  ) : (
                    <span className="opacity-0">·</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
