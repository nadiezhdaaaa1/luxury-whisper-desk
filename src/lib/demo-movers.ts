// DEMO ONLY — computes per-item % change over a period from the demo price
// history. Kept isolated so real-price wiring is a single import swap.
import type { PortfolioRow } from "@/lib/portfolio";
import { getItemHistory, periodStartDate, type Period } from "@/lib/demo-price-history";
import { getMockMarketPrice } from "@/lib/demo-market-prices";

export type Mover = {
  id: string;
  brand: string;
  model: string | null;
  category: PortfolioRow["category"];
  currentPrice: number;
  deltaPct: number;
};

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeDeltaPct(
  row: PortfolioRow,
  period: Period,
  customRange?: { from?: Date; to?: Date },
): { deltaPct: number; currentPrice: number } | null {
  const series = getItemHistory(row.id, row.purchase_price);
  if (series.length === 0) return null;

  let fromKey: string;
  let toKey: string;
  if (period === "custom" && customRange?.from && customRange?.to) {
    fromKey = fmt(customRange.from);
    toKey = fmt(customRange.to);
  } else if (period === "all") {
    fromKey = series[0].date;
    toKey = series[series.length - 1].date;
  } else {
    fromKey = fmt(periodStartDate(period));
    toKey = series[series.length - 1].date;
  }

  const startIdx = Math.max(
    0,
    series.findIndex((p) => p.date >= fromKey),
  );
  const revIdx = [...series].reverse().findIndex((p) => p.date <= toKey);
  const endIdx = revIdx < 0 ? series.length - 1 : series.length - 1 - revIdx;

  const startValue = series[startIdx]?.value ?? 0;
  const endValue = series[endIdx]?.value ?? 0;
  if (startValue <= 0) return null;
  const deltaPct = ((endValue - startValue) / startValue) * 100;
  const currentPrice = getMockMarketPrice(row.id, row.purchase_price).current;
  return { deltaPct, currentPrice };
}

export function getMovers(
  rows: PortfolioRow[],
  period: Period,
  customRange?: { from?: Date; to?: Date },
): { gainers: Mover[]; losers: Mover[] } {
  const movers: Mover[] = [];
  for (const r of rows) {
    const res = computeDeltaPct(r, period, customRange);
    if (!res) continue;
    movers.push({
      id: r.id,
      brand: r.brand,
      model: r.model,
      category: r.category,
      currentPrice: res.currentPrice,
      deltaPct: res.deltaPct,
    });
  }
  const gainers = movers
    .filter((m) => m.deltaPct > 0)
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 3);
  const losers = movers
    .filter((m) => m.deltaPct < 0)
    .sort((a, b) => a.deltaPct - b.deltaPct)
    .slice(0, 3);
  return { gainers, losers };
}

export const PERIOD_TITLE: Record<Period, string> = {
  all: "All time",
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  custom: "Selected range",
};
