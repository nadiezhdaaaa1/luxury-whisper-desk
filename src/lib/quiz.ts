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
export const BRAND_CATALOG: Record<
  Category,
  { name: string; segments: Segment[] }[]
> = {
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

export function suggestedBrands(
  categories: Category[],
  segments: Segment[],
): string[] {
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
// Per-brand indicative entry values (USD) for one representative piece.
// Tunable static MVP lookup — not live market data.
type BrandValue = { low: number; high: number; category: Category };
const BRAND_VALUES: Record<string, BrandValue> = {
  // Watches
  "Rolex": { low: 9000, high: 25000, category: "watches" },
  "Patek Philippe": { low: 30000, high: 90000, category: "watches" },
  "Audemars Piguet": { low: 25000, high: 75000, category: "watches" },
  "Richard Mille": { low: 120000, high: 300000, category: "watches" },
  "Omega": { low: 4500, high: 9000, category: "watches" },
  "IWC": { low: 5000, high: 10000, category: "watches" },
  "TAG Heuer": { low: 2000, high: 4500, category: "watches" },
  "Tudor": { low: 3200, high: 5500, category: "watches" },
  "Breitling": { low: 4000, high: 8000, category: "watches" },
  "Seiko": { low: 250, high: 800, category: "watches" },
  "Casio": { low: 60, high: 250, category: "watches" },
  // Jewelry
  "Van Cleef & Arpels": { low: 4500, high: 20000, category: "jewelry" },
  "Bvlgari": { low: 3500, high: 12000, category: "jewelry" },
  "Tiffany & Co.": { low: 1500, high: 8000, category: "jewelry" },
  "Boucheron": { low: 3500, high: 15000, category: "jewelry" },
  "David Yurman": { low: 800, high: 3500, category: "jewelry" },
  "Mejuri": { low: 120, high: 500, category: "jewelry" },
  "Pandora": { low: 60, high: 300, category: "jewelry" },
  // Bags
  "Hermès": { low: 12000, high: 45000, category: "bags" },
  "Chanel": { low: 8000, high: 20000, category: "bags" },
  "Louis Vuitton": { low: 2500, high: 7000, category: "bags" },
  "Dior": { low: 4500, high: 9000, category: "bags" },
  "Goyard": { low: 2500, high: 6500, category: "bags" },
  "Gucci": { low: 2000, high: 5000, category: "bags" },
  "Prada": { low: 2200, high: 5500, category: "bags" },
  "Saint Laurent": { low: 2000, high: 5000, category: "bags" },
  "Coach": { low: 300, high: 800, category: "bags" },
  "Michael Kors": { low: 250, high: 700, category: "bags" },
  // Dual-category
  "Cartier": { low: 5500, high: 18000, category: "jewelry" },
};

function segmentFallback(segments: Segment[]): { low: number; high: number } {
  if (segments.includes("luxury_invest")) return { low: 8000, high: 22000 };
  if (segments.includes("mid_market")) return { low: 2500, high: 6000 };
  return { low: 200, high: 800 };
}

function lookupBrand(name: string, segments: Segment[]): BrandValue {
  const hit = BRAND_VALUES[name];
  if (hit) return hit;
  const fb = segmentFallback(segments);
  return { ...fb, category: "watches" };
}

export type IndicativeRange = {
  low: number;
  high: number;
  perCategory: Partial<Record<Category, { low: number; high: number }>>;
  grailShare: number;
};

const MATURE_MULTIPLIER = 2.5;

export function indicativeRange(
  brands: string[],
  segments: Segment[],
): IndicativeRange {
  let low = 0;
  let high = 0;
  let grail = 0;
  const perCategory: Partial<Record<Category, { low: number; high: number }>> = {};
  for (const b of brands) {
    const v = lookupBrand(b, segments);
    low += v.low;
    high += v.high * MATURE_MULTIPLIER;
    const bucket = perCategory[v.category] ?? { low: 0, high: 0 };
    bucket.low += v.low;
    bucket.high += v.high * MATURE_MULTIPLIER;
    perCategory[v.category] = bucket;
    if (v.high >= 15000) grail += 1;
  }
  return {
    low,
    high,
    perCategory,
    grailShare: brands.length ? grail / brands.length : 0,
  };
}

export function formatCompactUSD(n: number): string {
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
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
