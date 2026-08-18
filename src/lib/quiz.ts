// Shared quiz types, brand catalog, localStorage helpers.
import { z } from "zod";

export const SEGMENTS = ["luxury_invest", "mid_market", "mass_market"] as const;
export const CATEGORIES = ["watches", "jewelry", "bags"] as const;
export const ROLES = ["collector", "reseller", "buyer"] as const;

export type Segment = (typeof SEGMENTS)[number];
export type Category = (typeof CATEGORIES)[number];
export type Role = (typeof ROLES)[number];

export type QuizAnswers = {
  segments: Segment[];
  categories: Category[];
  brands: string[];
  role: Role | null;
  email?: string;
};

export const EMPTY_ANSWERS: QuizAnswers = {
  segments: [],
  categories: [],
  brands: [],
  role: null,
};

export const quizAnswersSchema = z.object({
  segments: z.array(z.enum(SEGMENTS)).min(1),
  categories: z.array(z.enum(CATEGORIES)).min(1),
  brands: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
  role: z.enum(ROLES),
});
export type QuizAnswersPayload = z.infer<typeof quizAnswersSchema>;

export const SEGMENT_LABELS: Record<Segment, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
  mass_market: "Mass-market",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

export const ROLE_LABELS: Record<Role, string> = {
  collector: "Collector",
  reseller: "Reseller",
  buyer: "Buyer for myself",
};

// Default brand catalog per category, tagged by segment for smart defaults.
export const BRAND_CATALOG: Record<Category, { name: string; segments: Segment[] }[]> = {
  watches: [
    { name: "Rolex", segments: ["luxury_invest"] },
    { name: "Patek Philippe", segments: ["luxury_invest"] },
    { name: "Audemars Piguet", segments: ["luxury_invest"] },
    { name: "Richard Mille", segments: ["luxury_invest"] },
    { name: "Omega", segments: ["luxury_invest", "mid_market"] },
    { name: "Cartier", segments: ["luxury_invest", "mid_market"] },
    { name: "IWC", segments: ["mid_market"] },
    { name: "TAG Heuer", segments: ["mid_market"] },
    { name: "Tudor", segments: ["mid_market"] },
    { name: "Breitling", segments: ["mid_market"] },
    { name: "Seiko", segments: ["mass_market"] },
    { name: "Casio", segments: ["mass_market"] },
  ],
  jewelry: [
    { name: "Van Cleef & Arpels", segments: ["luxury_invest"] },
    { name: "Cartier", segments: ["luxury_invest"] },
    { name: "Bvlgari", segments: ["luxury_invest", "mid_market"] },
    { name: "Tiffany & Co.", segments: ["luxury_invest", "mid_market"] },
    { name: "Boucheron", segments: ["luxury_invest"] },
    { name: "David Yurman", segments: ["mid_market"] },
    { name: "Mejuri", segments: ["mid_market", "mass_market"] },
    { name: "Pandora", segments: ["mass_market"] },
  ],
  bags: [
    { name: "Hermès", segments: ["luxury_invest"] },
    { name: "Chanel", segments: ["luxury_invest"] },
    { name: "Louis Vuitton", segments: ["luxury_invest", "mid_market"] },
    { name: "Dior", segments: ["luxury_invest", "mid_market"] },
    { name: "Goyard", segments: ["luxury_invest"] },
    { name: "Gucci", segments: ["mid_market"] },
    { name: "Prada", segments: ["mid_market"] },
    { name: "Saint Laurent", segments: ["mid_market"] },
    { name: "Coach", segments: ["mass_market"] },
    { name: "Michael Kors", segments: ["mass_market"] },
  ],
};

export function suggestedBrands(categories: Category[], segments: Segment[]): string[] {
  const set = new Set<string>();
  for (const c of categories) {
    for (const b of BRAND_CATALOG[c]) {
      if (segments.length === 0 || b.segments.some((s) => segments.includes(s))) {
        set.add(b.name);
      }
    }
  }
  return Array.from(set);
}

// ---- localStorage draft ----
const KEY = "lux_quiz_draft";

export function readDraft(): QuizAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizAnswers>;
    return {
      segments: (parsed.segments ?? []).filter((s): s is Segment =>
        (SEGMENTS as readonly string[]).includes(s),
      ),
      categories: (parsed.categories ?? []).filter((c): c is Category =>
        (CATEGORIES as readonly string[]).includes(c),
      ),
      brands: Array.isArray(parsed.brands)
        ? parsed.brands.filter((b) => typeof b === "string")
        : [],
      role:
        parsed.role && (ROLES as readonly string[]).includes(parsed.role)
          ? (parsed.role as Role)
          : null,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export function writeDraft(answers: QuizAnswers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(answers));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function draftIsComplete(a: QuizAnswers | null): a is QuizAnswers & {
  role: Role;
} {
  return !!a && a.segments.length > 0 && a.categories.length > 0 && a.brands.length > 0 && !!a.role;
}

// Deterministic placeholder indicative value for the aha reveal.
export function indicativeValue(brands: string[]): number {
  const base = 4200;
  const bump = brands.reduce((acc, b) => acc + (b.length % 7) * 350, 0);
  return brands.length * base + bump;
}

// ---- Range estimator ----
// Static, tunable per-brand indicative entry value (USD) for ONE
// representative piece at retail. Not live market data.
const BASE_BRAND_VALUES: Record<string, { low: number; high: number }> = {
  // Watches
  Rolex: { low: 12000, high: 22000 },
  "Patek Philippe": { low: 45000, high: 85000 },
  "Audemars Piguet": { low: 35000, high: 65000 },
  "Richard Mille": { low: 160000, high: 300000 },
  Omega: { low: 5500, high: 9500 },
  Cartier: { low: 7500, high: 14000 },
  IWC: { low: 6000, high: 11000 },
  "TAG Heuer": { low: 2800, high: 5000 },
  Tudor: { low: 3800, high: 6500 },
  Breitling: { low: 5000, high: 9000 },
  Seiko: { low: 400, high: 800 },
  Casio: { low: 100, high: 250 },
  // Jewelry
  "Van Cleef & Arpels": { low: 8500, high: 16000 },
  Bvlgari: { low: 5500, high: 10000 },
  "Tiffany & Co.": { low: 3500, high: 6500 },
  Boucheron: { low: 6000, high: 11000 },
  "David Yurman": { low: 1500, high: 2800 },
  Mejuri: { low: 200, high: 400 },
  Pandora: { low: 100, high: 250 },
  // Bags
  Hermès: { low: 15000, high: 28000 },
  Chanel: { low: 10000, high: 18000 },
  "Louis Vuitton": { low: 3500, high: 6500 },
  Dior: { low: 5500, high: 9500 },
  Goyard: { low: 3500, high: 6500 },
  Gucci: { low: 2800, high: 5000 },
  Prada: { low: 3000, high: 5500 },
  "Saint Laurent": { low: 2800, high: 5000 },
  Coach: { low: 400, high: 800 },
  "Michael Kors": { low: 300, high: 600 },
};

const CATEGORY_LABEL_TO_KEY: Record<string, Category> = {
  Watches: "watches",
  Jewelry: "jewelry",
  Bags: "bags",
};

// Brands may be stored as "Rolex — Watches" (encoded with a category tag)
// or as a raw name. Parse both.
function parseEncodedBrand(encoded: string): {
  name: string;
  category: Category | null;
} {
  const sep = " — ";
  const i = encoded.lastIndexOf(sep);
  if (i === -1) return { name: encoded, category: null };
  const label = encoded.slice(i + sep.length);
  return {
    name: encoded.slice(0, i),
    category: CATEGORY_LABEL_TO_KEY[label] ?? null,
  };
}

// Per-tier scaling used when the catalog provides a tier for a brand.
type CatalogTier = "luxury_invest" | "mid_market" | "mass_market";

const TIER_MULTIPLIER: Record<CatalogTier, number> = {
  luxury_invest: 1.4,
  mid_market: 1.0,
  mass_market: 0.6,
};

function segmentMultiplier(segments: Segment[]): number {
  if (segments.includes("luxury_invest")) return 1.3;
  if (segments.includes("mid_market")) return 1.0;
  return 0.75;
}

function fallbackFor(category: Category | null, mult: number): { low: number; high: number } {
  const base =
    category === "jewelry"
      ? { low: 2500, high: 4500 }
      : category === "bags"
        ? { low: 3000, high: 5500 }
        : { low: 3500, high: 6500 };
  return { low: base.low * mult, high: base.high * mult };
}

export type IndicativeRange = {
  low: number;
  high: number;
  perCategory: Partial<Record<Category, { low: number; high: number }>>;
  grailShare: number;
};

const SPREAD_CAP = 2;
function tighten(r: { low: number; high: number }) {
  if (r.low <= 0) return r;
  const cappedHigh = Math.min(r.high, r.low * SPREAD_CAP);
  return { low: r.low, high: Math.max(cappedHigh, r.low * 1.4) };
}

export type TierResolver = (name: string, category: Category | null) => CatalogTier | null;

export function indicativeRange(
  brands: string[],
  segments: Segment[],
  categories: Category[] = [],
  resolveTier?: TierResolver,
): IndicativeRange {
  const segMult = segmentMultiplier(segments);
  const perCategory: Partial<Record<Category, { low: number; high: number }>> = {};
  for (const c of categories) perCategory[c] = { low: 0, high: 0 };

  let grail = 0;
  for (const encoded of brands) {
    const { name, category } = parseEncodedBrand(encoded);
    const tier = resolveTier?.(name, category) ?? null;
    const mult = tier ? TIER_MULTIPLIER[tier] : segMult;
    const known = BASE_BRAND_VALUES[name];
    const scaled = known
      ? { low: known.low * mult, high: known.high * mult }
      : fallbackFor(category, mult);
    const bucketCat: Category = category ?? categories[0] ?? "watches";
    const prev = perCategory[bucketCat] ?? { low: 0, high: 0 };
    perCategory[bucketCat] = {
      low: prev.low + scaled.low,
      high: prev.high + scaled.high,
    };
    if (scaled.high >= 20000) grail += 1;
  }

  let low = 0;
  let high = 0;
  for (const c of Object.keys(perCategory) as Category[]) {
    const t = tighten(perCategory[c]!);
    perCategory[c] = t;
    low += t.low;
    high += t.high;
  }
  const headline = tighten({ low, high });
  return {
    low: headline.low,
    high: headline.high,
    perCategory,
    grailShare: brands.length ? grail / brands.length : 0,
  };
}

export function formatCompactUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function personalizationLine(
  brands: string[],
  segments: Segment[],
  categories: Category[],
): string {
  const catNames = categories.map((c) =>
    c === "watches" ? "watches" : c === "jewelry" ? "fine jewelry" : "designer bags",
  );
  const catPhrase =
    catNames.length === 0
      ? "pieces"
      : catNames.length === 1
        ? catNames[0]
        : catNames.length === 2
          ? `${catNames[0]} and ${catNames[1]}`
          : `${catNames.slice(0, -1).join(", ")}, and ${catNames[catNames.length - 1]}`;
  const tier = segments.includes("luxury_invest")
    ? "mostly grail"
    : segments.includes("mid_market")
      ? "a mid-market mix of"
      : "everyday";
  const n = brands.length;
  return `Across your ${n} brand${n === 1 ? "" : "s"} — ${tier} ${catPhrase}.`;
}
