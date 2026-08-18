import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { PortfolioRow } from "@/lib/portfolio";
import type { Category } from "@/lib/quiz";
import { getCategorySeries, sliceForPeriod, type Period } from "@/lib/demo-price-history";
import { CATEGORY_LABELS } from "@/lib/quiz";

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Row = {
  key: Category;
  label: string;
  value: number;
  deltaPct: number | null;
  color: string;
};

type Props = {
  rows: PortfolioRow[];
  period: Period;
  customRange?: { from?: Date; to?: Date };
};

const CATEGORIES: Category[] = ["watches", "jewelry", "bags"];

// Ramp: darkest at index 0, lighter as index grows. Uses color-mix so it
// works from any base OKLCH token.
function rampColor(base: string, index: number, total: number): string {
  if (total <= 1) return `var(${base})`;
  const pct = Math.round((index / (total - 1)) * 55); // 0% ... 55% white
  return `color-mix(in oklch, var(${base}), white ${pct}%)`;
}

export function CategoryDonutCard({ rows, period, customRange }: Props) {
  const [hoverKey, setHoverKey] = useState<Category | null>(null);

  const built: Row[] = useMemo(() => {
    const raw = CATEGORIES.map((cat) => {
      const items = rows.filter((r) => r.category === cat);
      if (items.length === 0) return null;
      const series = getCategorySeries(rows, cat);
      const s = sliceForPeriod(series, period, customRange);
      return {
        key: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        value: s.endValue,
        deltaPct: s.deltaPct,
      };
    }).filter(Boolean) as Array<Omit<Row, "color">>;

    // Split by direction, then assign shades darkest = largest share per group.
    const risers = raw.filter((r) => (r.deltaPct ?? 0) >= 0).sort((a, b) => b.value - a.value);
    const fallers = raw.filter((r) => (r.deltaPct ?? 0) < 0).sort((a, b) => b.value - a.value);

    const withColor = new Map<Category, string>();
    risers.forEach((r, i) => withColor.set(r.key, rampColor("--positive", i, risers.length)));
    fallers.forEach((r, i) => withColor.set(r.key, rampColor("--alert", i, fallers.length)));

    return raw.map((r) => ({ ...r, color: withColor.get(r.key)! }));
  }, [rows, period, customRange]);

  const total = built.reduce((s, r) => s + r.value, 0);

  if (built.length === 0) {
    return (
      <section className="card-flat p-4 sm:p-5 h-full flex flex-col">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          By category
        </p>
        <div className="mt-6 flex-1 grid place-items-center text-sm text-muted-foreground text-center">
          Add portfolio items to see category breakdown.
        </div>
      </section>
    );
  }

  // Build donut arcs.
  const arcs = useMemo(() => {
    const R_OUT = 42;
    const R_IN = 26;
    const CENTER = 50;
    let acc = 0;
    return built.map((r) => {
      const frac = total > 0 ? r.value / total : 0;
      const start = acc;
      const end = acc + frac;
      acc = end;
      // Full-circle single slice fallback.
      if (frac >= 0.999) {
        return {
          key: r.key,
          d: `M ${CENTER - R_OUT} ${CENTER} A ${R_OUT} ${R_OUT} 0 1 1 ${CENTER + R_OUT} ${CENTER} A ${R_OUT} ${R_OUT} 0 1 1 ${CENTER - R_OUT} ${CENTER} Z M ${CENTER - R_IN} ${CENTER} A ${R_IN} ${R_IN} 0 1 0 ${CENTER + R_IN} ${CENTER} A ${R_IN} ${R_IN} 0 1 0 ${CENTER - R_IN} ${CENTER} Z`,
          fillRule: "evenodd" as const,
        };
      }
      const a1 = start * Math.PI * 2 - Math.PI / 2;
      const a2 = end * Math.PI * 2 - Math.PI / 2;
      const large = end - start > 0.5 ? 1 : 0;
      const x1o = CENTER + R_OUT * Math.cos(a1);
      const y1o = CENTER + R_OUT * Math.sin(a1);
      const x2o = CENTER + R_OUT * Math.cos(a2);
      const y2o = CENTER + R_OUT * Math.sin(a2);
      const x1i = CENTER + R_IN * Math.cos(a2);
      const y1i = CENTER + R_IN * Math.sin(a2);
      const x2i = CENTER + R_IN * Math.cos(a1);
      const y2i = CENTER + R_IN * Math.sin(a1);
      const d = [
        `M ${x1o} ${y1o}`,
        `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2o} ${y2o}`,
        `L ${x1i} ${y1i}`,
        `A ${R_IN} ${R_IN} 0 ${large} 0 ${x2i} ${y2i}`,
        "Z",
      ].join(" ");
      return { key: r.key, d, fillRule: "nonzero" as const };
    });
  }, [built, total]);

  return (
    <section className="card-flat p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          By category
        </p>
        <Link
          to="/app/portfolio"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          To the Portfolio
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-5 items-center">
        <div className="relative">
          <svg viewBox="0 0 100 100" className="h-48 w-48" role="img" aria-label="Category share">
            {arcs.map((a) => {
              const row = built.find((r) => r.key === a.key)!;
              const dim = hoverKey && hoverKey !== a.key;
              const tip = `${row.label} — ${fmtUSD(row.value)} (${(row.deltaPct ?? 0) >= 0 ? "+" : ""}${(row.deltaPct ?? 0).toFixed(1)}%)`;
              return (
                <path
                  key={a.key}
                  d={a.d}
                  fill={row.color}
                  fillRule={a.fillRule}
                  className="transition-opacity duration-150 cursor-pointer"
                  style={{ opacity: dim ? 0.35 : 1 }}
                  onMouseEnter={() => setHoverKey(a.key)}
                  onMouseLeave={() => setHoverKey(null)}
                >
                  <title>{tip}</title>
                </path>
              );
            })}
          </svg>
        </div>

        <ul className="space-y-1.5">
          {built.map((r) => {
            const isUp = (r.deltaPct ?? 0) >= 0;
            const hovered = hoverKey === r.key;
            return (
              <li key={r.key}>
                <Link
                  to="/app/portfolio"
                  search={{ category: r.key }}
                  onMouseEnter={() => setHoverKey(r.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors",
                    hovered ? "bg-surface-2" : "hover:bg-surface-2/60",
                  )}
                  aria-label={`View ${r.label} in portfolio`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-foreground truncate">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-display font-semibold tabular-nums text-foreground">
                      {fmtUSD(r.value)}
                    </span>
                    {r.deltaPct != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                          isUp ? "text-[color:var(--positive)]" : "text-[color:var(--alert)]",
                        )}
                      >
                        {isUp ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {(isUp ? "+" : "") + r.deltaPct.toFixed(1) + "%"}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
