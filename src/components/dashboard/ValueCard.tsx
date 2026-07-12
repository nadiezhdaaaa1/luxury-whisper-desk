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

const CATEGORY_LABEL: Record<Category, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

type Props = {
  portfolio: PortfolioRow[];
  period: Period;
  customRange?: { from?: Date; to?: Date };
  hasItems: boolean;
  onAdd?: () => void;
};

export function ValueCard({ portfolio, period, customRange, hasItems, onAdd }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Available categories/brands derived from the actual portfolio.
  const availableCategories = useMemo<Category[]>(() => {
    const set = new Set<Category>();
    for (const p of portfolio) set.add(p.category);
    return (["watches", "jewelry", "bags"] as Category[]).filter((c) => set.has(c));
  }, [portfolio]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of portfolio) {
      if (categoryFilter === "all" || p.category === categoryFilter) set.add(p.brand);
    }
    return [...set].sort();
  }, [portfolio, categoryFilter]);

  // Prune selected brands that are no longer available (e.g. after category change).
  useEffect(() => {
    setSelectedBrands((prev) => prev.filter((b) => availableBrands.includes(b)));
  }, [availableBrands]);

  const filteredPortfolio = useMemo(() => {
    return portfolio.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
      return true;
    });
  }, [portfolio, categoryFilter, selectedBrands]);

  const slice = useMemo(
    () => sliceForPeriod(getPortfolioSeries(filteredPortfolio), period, customRange),
    [filteredPortfolio, period, customRange],
  );

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

  const hasFilteredItems = hasItems && filteredPortfolio.length > 0;
  const showFilters = hasItems && availableCategories.length > 0;
  const brandBtnLabel =
    selectedBrands.length === 0
      ? "All brands"
      : selectedBrands.length === 1
        ? selectedBrands[0]
        : `${selectedBrands.length} brands`;

  return (
    <section className="card-flat p-4 sm:p-7 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Portfolio market value
        </p>
        {showFilters ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-full border border-hairline bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition",
                  categoryFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition",
                    categoryFilter === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            {availableBrands.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2 transition"
                  >
                    <Filter className="h-3 w-3" />
                    {brandBtnLabel}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
                      Brands
                    </span>
                    {selectedBrands.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedBrands([])}
                        className="text-xs text-primary hover:underline"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {availableBrands.map((b) => {
                      const checked = selectedBrands.includes(b);
                      return (
                        <label
                          key={b}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-surface-2"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedBrands((prev) =>
                                v ? [...prev, b] : prev.filter((x) => x !== b),
                              );
                            }}
                          />
                          <span className="flex-1">{b}</span>
                          {checked ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasFilteredItems ? (

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
      ) : hasItems ? (
        <div className="mt-4 flex flex-col isolate relative overflow-hidden rounded-md">
          <EmptyChartBackground className="opacity-25 -z-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="font-display font-bold tracking-tight text-muted-foreground/40 text-[48px] leading-none tabular-nums">
              $—
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              No portfolio pieces match the current filters. Try switching categories or clearing brand selection.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setCategoryFilter("all");
                setSelectedBrands([]);
              }}
            >
              Reset filters
            </Button>
          </div>
          <div className="relative z-10 mt-4 min-h-[90px]" aria-hidden="true" />
        </div>
      ) : (
        <div className="mt-4 flex flex-col isolate relative overflow-hidden rounded-md">
          <EmptyChartBackground className="opacity-30 -z-10 pointer-events-none" />
          <div className="relative z-10">
            <div className="font-display font-bold tracking-tight text-muted-foreground/40 text-[48px] leading-none tabular-nums">
              $—
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Track how your collection's market value moves over time. Add your first piece to unlock daily price history and trends.
            </p>
            {onAdd ? (
              <Button size="sm" className="mt-3 gap-1 self-start" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Add portfolio piece
              </Button>
            ) : null}
          </div>
          <div className="relative z-10 mt-4 min-h-[90px]" aria-hidden="true" />
        </div>
      )}


    </section>
  );
}

function EmptyChartBackground({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={cn("absolute inset-0 h-full w-full", className)}
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

