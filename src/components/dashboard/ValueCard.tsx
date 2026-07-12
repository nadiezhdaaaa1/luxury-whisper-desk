import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, Filter, Plus } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PERIOD_LABEL,
  sliceForPeriod,
  getPortfolioSeries,
  type Period,
} from "@/lib/demo-price-history";
import type { PortfolioRow } from "@/lib/portfolio";
import type { Category } from "@/lib/quiz";


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

export function ValueCard({ slice, period, hasItems, onAdd }: Props) {
  const value = useCountUp(slice.endValue);
  const isUp = (slice.deltaPct ?? 0) >= 0;
  const color = isUp ? "var(--positive)" : "var(--alert)";
  const chartData = useMemo(() => slice.series.map((p) => ({ date: p.date, value: p.value })), [slice.series]);
  const yDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 1];
    const vals = chartData.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(1, (max - min) * 0.12);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [chartData]);
  const xTicks = useMemo(() => {
    if (chartData.length < 2) return [] as string[];
    const n = chartData.length;
    const count = Math.min(5, n);
    const step = (n - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => chartData[Math.round(i * step)].date);
  }, [chartData]);

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

          <div className="mt-6 flex-1 min-h-[180px]">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                  <defs>
                    <linearGradient id="value-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="2 4"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    ticks={xTicks}
                    tickFormatter={fmtTickDate}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={yDomain}
                    tickFormatter={fmtTickUSD}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={48}
                    orientation="right"
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={<ChartTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#value-fill)"
                    isAnimationActive={false}
                    activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2, fill: color }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col flex-1">
          <div className="font-display font-bold tracking-tight text-muted-foreground/40 text-[48px] leading-none tabular-nums">
            $—
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Track how your collection's market value moves over time. Add your first piece to unlock daily price history and trends.
          </p>
          {onAdd ? (
            <Button size="sm" className="mt-4 gap-1 self-start" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add portfolio piece
            </Button>
          ) : null}
          <div className="mt-6 flex-1 min-h-[180px] relative overflow-hidden rounded-md">
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full opacity-40"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="empty-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[10, 20, 30].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="0.3"
                  strokeDasharray="1 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d="M0,30 L10,26 L20,28 L30,22 L40,24 L50,18 L60,20 L70,14 L80,16 L90,10 L100,12 L100,40 L0,40 Z"
                fill="url(#empty-fill)"
              />
              <path
                d="M0,30 L10,26 L20,28 L30,22 L40,24 L50,18 L60,20 L70,14 L80,16 L90,10 L100,12"
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity="0.35"
                strokeWidth="0.6"
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 1.5 }}
              />
            </svg>
          </div>
        </div>
      )}

    </section>
  );
}

function fmtTickDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTickUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

function fmtFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type TooltipEntry = { value?: number; payload?: { date?: string } };
function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const v = typeof p.value === "number" ? p.value : 0;
  const date = p.payload?.date ?? "";
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{fmtFullDate(date)}</div>
      <div className="mt-0.5 font-display font-semibold tabular-nums text-primary">{fmtUSD(v)}</div>
    </div>
  );
}

