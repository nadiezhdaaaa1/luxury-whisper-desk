// DEMO ONLY — synthetic history, replace with real pricing feed in Phase 2.
// All dashboard value/trend/delta figures MUST read from this single module,
// so swapping to a real pricing source later is one wiring change.
import type { PortfolioRow } from "@/lib/portfolio";
import type { Category } from "@/lib/quiz";
import { getMockMarketPrice } from "@/lib/demo-market-prices";

export type Period = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type PricePoint = { date: string; value: number }; // date = YYYY-MM-DD

const HISTORY_DAYS = 400;

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller for gaussian noise.
function gauss(rand: () => number): number {
  const u = Math.max(1e-9, rand());
  const v = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Cache series by itemId — stable across renders.
const cache = new Map<string, PricePoint[]>();

/**
 * Deterministic daily price series for a single portfolio item.
 * - Anchored so today's value = current mock market price (continuity with
 *   the portfolio cards).
 * - Mild upward drift (~0.05%/day) plus gaussian wiggle (~1.5% stddev), so
 *   short windows can dip red while long windows trend green.
 */
export function getItemHistory(
  itemId: string,
  purchasePrice: number | null | undefined,
): PricePoint[] {
  const cached = cache.get(itemId);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endPrice = getMockMarketPrice(itemId, purchasePrice).current;

  const rand = mulberry32(hashString(`hist::${itemId}`));
  // Per-item drift 0.02%..0.09%/day.
  const drift = 0.0002 + rand() * 0.0007;
  const wiggle = 0.015;

  // Build daily log-return series then anchor so the last value = endPrice.
  const logs = new Array<number>(HISTORY_DAYS);
  let acc = 0;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    acc += drift + wiggle * gauss(rand);
    logs[i] = acc;
  }
  const last = logs[HISTORY_DAYS - 1];
  const series: PricePoint[] = new Array(HISTORY_DAYS);
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (HISTORY_DAYS - 1 - i));
    const value = Math.max(1, Math.round(endPrice * Math.exp(logs[i] - last)));
    series[i] = { date: fmtDate(d), value };
  }
  cache.set(itemId, series);
  return series;
}

function sumSeries(list: PricePoint[][]): PricePoint[] {
  if (list.length === 0) return [];
  const n = list[0].length;
  const out: PricePoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const s of list) v += s[i].value;
    out[i] = { date: list[0][i].date, value: v };
  }
  return out;
}

export function getPortfolioSeries(rows: PortfolioRow[]): PricePoint[] {
  return sumSeries(rows.map((r) => getItemHistory(r.id, r.purchase_price)));
}

export function getCategorySeries(rows: PortfolioRow[], category: Category): PricePoint[] {
  return sumSeries(
    rows.filter((r) => r.category === category).map((r) => getItemHistory(r.id, r.purchase_price)),
  );
}

export type PeriodSlice = {
  series: PricePoint[];
  startValue: number;
  endValue: number;
  deltaAbs: number;
  deltaPct: number | null;
};

export function periodStartDate(period: Period, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case "week":
      d.setDate(d.getDate() - 7);
      break;
    case "month":
      d.setMonth(d.getMonth() - 1);
      break;
    case "quarter":
      d.setMonth(d.getMonth() - 3);
      break;
    case "year":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "all":
    case "custom":
    default:
      d.setDate(d.getDate() - (HISTORY_DAYS - 1));
      break;
  }
  return d;
}

export function sliceForPeriod(
  series: PricePoint[],
  period: Period,
  customRange?: { from?: Date; to?: Date },
): PeriodSlice {
  if (series.length === 0) {
    return { series: [], startValue: 0, endValue: 0, deltaAbs: 0, deltaPct: null };
  }

  let fromKey: string;
  let toKey: string;
  if (period === "custom" && customRange?.from && customRange?.to) {
    fromKey = fmtDate(customRange.from);
    toKey = fmtDate(customRange.to);
  } else if (period === "all") {
    fromKey = series[0].date;
    toKey = series[series.length - 1].date;
  } else {
    fromKey = fmtDate(periodStartDate(period));
    toKey = series[series.length - 1].date;
  }

  const startIdx = Math.max(
    0,
    series.findIndex((p) => p.date >= fromKey),
  );
  const endIdxRaw = [...series].reverse().findIndex((p) => p.date <= toKey);
  const endIdx = endIdxRaw < 0 ? series.length - 1 : series.length - 1 - endIdxRaw;

  const sliced = series.slice(startIdx, endIdx + 1);
  const startValue = sliced[0]?.value ?? 0;
  const endValue = sliced[sliced.length - 1]?.value ?? 0;
  const deltaAbs = endValue - startValue;
  const deltaPct = startValue > 0 ? (deltaAbs / startValue) * 100 : null;

  return { series: sliced, startValue, endValue, deltaAbs, deltaPct };
}

export const PERIOD_LABEL: Record<Period, string> = {
  all: "all time",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
  custom: "range",
};
