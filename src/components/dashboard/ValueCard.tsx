import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PERIOD_LABEL, type PeriodSlice, type Period } from "@/lib/demo-price-history";

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

function useCountUp(target: number, durationMs = 900): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs, reduced]);

  return value;
}

type Props = {
  slice: PeriodSlice;
  period: Period;
  hasItems: boolean;
  onAdd?: () => void;
};

export function ValueCard({ slice, period, hasItems }: Props) {
  const value = useCountUp(slice.endValue);
  const isUp = (slice.deltaPct ?? 0) >= 0;
  const color = isUp ? "var(--positive)" : "var(--alert)";
  const path = useMemo(() => buildPath(slice.series.map((p) => p.value)), [slice.series]);

  return (
    <section className="card-flat p-4 sm:p-7 flex flex-col h-full">
      <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
        Portfolio market value
      </p>

      {hasItems ? (
        <>
          <div className="mt-6 font-display font-bold tracking-tight text-primary text-[48px] leading-none tabular-nums">
            {fmtUSD(value)}
          </div>

          {slice.deltaPct != null ? (
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-sm font-semibold",
                isUp ? "text-[color:var(--positive)]" : "text-[color:var(--alert)]",
              )}
            >
              {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {(isUp ? "+" : "") + slice.deltaPct.toFixed(1) + "%"}
              <span className="ml-1 text-muted-foreground font-normal">
                this {PERIOD_LABEL[period]}
              </span>
            </div>
          ) : null}

          <div className="mt-6 flex-1 min-h-[120px]">
            {path ? (
              <svg
                viewBox="0 0 100 30"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="value-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={path.area} fill="url(#value-fill)" />
                <path
                  d={path.line}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeWidth: 2 }}
                />
              </svg>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-3 font-display font-semibold tracking-tight text-foreground text-2xl sm:text-3xl leading-tight max-w-xl">
          Add portfolio items to see market value
        </div>
      )}
    </section>
  );
}

function buildPath(values: number[]): { line: string; area: string } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 30 - ((v - min) / range) * 28 - 1;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L100,30 L0,30 Z`;
  return { line, area };
}
