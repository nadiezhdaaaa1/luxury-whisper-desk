// DEMO ONLY — placeholder prices, replace with real pricing source in Phase 2.
// All fake "current market price" values in the app must come from this module.
// Everything is deterministic per item id (seeded PRNG) so cards don't flicker.
import type { PortfolioRow } from "@/lib/portfolio";
import type { Category } from "@/lib/quiz";

export const DEMO_MARKET_PRICES = true;

// Per-tab session salt — keeps numbers stable within a session but different
// between reloads, so demos stay lively without flickering on re-render.
const SESSION_SALT: number = (() => {
  if (typeof window === "undefined") return 0x9e37;
  const w = window as unknown as { __demoPriceSalt?: number };
  if (w.__demoPriceSalt == null) {
    w.__demoPriceSalt = Math.floor(Math.random() * 0xffffffff);
  }
  return w.__demoPriceSalt;
})();

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

function rngFor(itemId: string, tag: string) {
  return mulberry32(hashString(`${itemId}::${tag}::${SESSION_SALT}`));
}

export type MockPrice = {
  current: number;
  low: number;
  high: number;
};

const FALLBACK_ANCHOR = 500;

export function getMockMarketPrice(
  itemId: string,
  purchasePrice: number | null | undefined,
): MockPrice {
  const rand = rngFor(itemId, "px");
  const anchor =
    purchasePrice != null && Number.isFinite(Number(purchasePrice)) && Number(purchasePrice) > 0
      ? Number(purchasePrice)
      : FALLBACK_ANCHOR;

  // Signed drift 5–20% of anchor.
  const magnitude = 0.05 + rand() * 0.15;
  const direction = rand() < 0.5 ? -1 : 1;
  const current = Math.max(1, Math.round(anchor * (1 + direction * magnitude)));

  // Range 4–10% around current.
  const spreadLow = 0.04 + rand() * 0.06;
  const spreadHigh = 0.04 + rand() * 0.06;
  const low = Math.max(1, Math.round(current * (1 - spreadLow)));
  const high = Math.max(low + 1, Math.round(current * (1 + spreadHigh)));

  return { current, low, high };
}

// Breakdown summary by category using mock market prices.
export type MarketSummary = {
  all: { count: number; value: number; pctVsPurchase: number | null };
  watches: { count: number; value: number; pctVsPurchase: number | null };
  jewelry: { count: number; value: number; pctVsPurchase: number | null };
  bags: { count: number; value: number; pctVsPurchase: number | null };
};

function pct(mkt: number, purchase: number): number | null {
  if (!(purchase > 0)) return null;
  return ((mkt - purchase) / purchase) * 100;
}

export function summarizeMarket(rows: PortfolioRow[]): MarketSummary {
  const buckets: Record<Category | "all", { count: number; mkt: number; purchase: number }> = {
    all: { count: 0, mkt: 0, purchase: 0 },
    watches: { count: 0, mkt: 0, purchase: 0 },
    jewelry: { count: 0, mkt: 0, purchase: 0 },
    bags: { count: 0, mkt: 0, purchase: 0 },
  };

  for (const r of rows) {
    const mp = getMockMarketPrice(r.id, r.purchase_price);
    const pp = r.purchase_price != null ? Number(r.purchase_price) : 0;
    for (const key of ["all", r.category] as const) {
      buckets[key].count += 1;
      buckets[key].mkt += mp.current;
      buckets[key].purchase += pp;
    }
  }

  const build = (k: Category | "all") => ({
    count: buckets[k].count,
    value: buckets[k].mkt,
    pctVsPurchase: pct(buckets[k].mkt, buckets[k].purchase),
  });

  return {
    all: build("all"),
    watches: build("watches"),
    jewelry: build("jewelry"),
    bags: build("bags"),
  };
}

// Purchase-value breakdown (real numbers) using the same shape for the header.
export type PurchaseSummary = {
  all: { count: number; value: number };
  watches: { count: number; value: number };
  jewelry: { count: number; value: number };
  bags: { count: number; value: number };
};

export function summarizePurchase(rows: PortfolioRow[]): PurchaseSummary {
  const b: PurchaseSummary = {
    all: { count: 0, value: 0 },
    watches: { count: 0, value: 0 },
    jewelry: { count: 0, value: 0 },
    bags: { count: 0, value: 0 },
  };
  for (const r of rows) {
    const pp = r.purchase_price != null ? Number(r.purchase_price) : 0;
    b.all.count += 1;
    b.all.value += pp;
    b[r.category].count += 1;
    b[r.category].value += pp;
  }
  return b;
}
