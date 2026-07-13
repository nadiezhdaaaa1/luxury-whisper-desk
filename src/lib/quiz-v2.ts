// V2 quiz — fully independent copy of src/lib/quiz.ts.
// Do NOT share state with V1; changes here must not affect V1.
import { z } from "zod";

export const SEGMENTS_V2 = ["luxury_invest", "mid_market", "mass_market"] as const;
export const CATEGORIES_V2 = ["watches", "jewelry", "bags"] as const;
export const ROLES_V2 = ["collector", "reseller", "buyer"] as const;

export type SegmentV2 = (typeof SEGMENTS_V2)[number];
export type CategoryV2 = (typeof CATEGORIES_V2)[number];
export type RoleV2 = (typeof ROLES_V2)[number];

export type QuizAnswersV2 = {
  categories: CategoryV2[];
  brands: string[];
  segments: SegmentV2[]; // inferred from brand picks
  role: RoleV2 | null;
  email?: string;
};

export const EMPTY_ANSWERS_V2: QuizAnswersV2 = {
  categories: [],
  brands: [],
  segments: [],
  role: null,
};

export const quizAnswersSchemaV2 = z.object({
  segments: z.array(z.enum(SEGMENTS_V2)).min(1),
  categories: z.array(z.enum(CATEGORIES_V2)).min(1),
  brands: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
  role: z.enum(ROLES_V2),
});
export type QuizAnswersV2Payload = z.infer<typeof quizAnswersSchemaV2>;

export const SEGMENT_LABELS_V2: Record<SegmentV2, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
  mass_market: "Mass-market",
};

export const CATEGORY_LABELS_V2: Record<CategoryV2, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

export const ROLE_LABELS_V2: Record<RoleV2, string> = {
  collector: "Collector",
  reseller: "Reseller",
  buyer: "Buyer for myself",
};

// Encoded brand: "Name — CategoryLabel" (same shape V1 uses so profile writes stay compatible).
export const SEP_V2 = " — ";
export function encodeBrandV2(name: string, cat: CategoryV2): string {
  return `${name}${SEP_V2}${CATEGORY_LABELS_V2[cat]}`;
}
export function brandCategoryLabelV2(b: string): string | null {
  const i = b.lastIndexOf(SEP_V2);
  return i === -1 ? null : b.slice(i + SEP_V2.length);
}
export function brandDisplayNameV2(b: string): string {
  const i = b.lastIndexOf(SEP_V2);
  return i === -1 ? b : b.slice(0, i);
}

// ---- localStorage draft (separate key from V1) ----
const KEY_V2 = "lux_quiz_draft_v2";

export function readDraftV2(): QuizAnswersV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizAnswersV2>;
    return {
      categories: (parsed.categories ?? []).filter((c): c is CategoryV2 =>
        (CATEGORIES_V2 as readonly string[]).includes(c),
      ),
      brands: Array.isArray(parsed.brands)
        ? parsed.brands.filter((b) => typeof b === "string")
        : [],
      segments: (parsed.segments ?? []).filter((s): s is SegmentV2 =>
        (SEGMENTS_V2 as readonly string[]).includes(s),
      ),
      role:
        parsed.role && (ROLES_V2 as readonly string[]).includes(parsed.role)
          ? (parsed.role as RoleV2)
          : null,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export function writeDraftV2(answers: QuizAnswersV2): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_V2, JSON.stringify(answers));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraftV2(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_V2);
  } catch {
    /* ignore */
  }
}

export function draftIsCompleteV2(a: QuizAnswersV2 | null): a is QuizAnswersV2 & {
  role: RoleV2;
} {
  return (
    !!a &&
    a.categories.length > 0 &&
    a.brands.length > 0 &&
    a.segments.length > 0 &&
    !!a.role
  );
}

// ---- Range estimator (copied verbatim from V1 so V2 is independent) ----
const BASE_BRAND_VALUES: Record<string, { low: number; high: number }> = {
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
  "Van Cleef & Arpels": { low: 8500, high: 16000 },
  Bvlgari: { low: 5500, high: 10000 },
  "Tiffany & Co.": { low: 3500, high: 6500 },
  Boucheron: { low: 6000, high: 11000 },
  "David Yurman": { low: 1500, high: 2800 },
  Mejuri: { low: 200, high: 400 },
  Pandora: { low: 100, high: 250 },
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

const CATEGORY_LABEL_TO_KEY: Record<string, CategoryV2> = {
  Watches: "watches",
  Jewelry: "jewelry",
  Bags: "bags",
};

type CatalogTierV2 = "luxury_invest" | "mid_market" | "mass_market";
const TIER_MULTIPLIER: Record<CatalogTierV2, number> = {
  luxury_invest: 1.4,
  mid_market: 1.0,
  mass_market: 0.6,
};

function segmentMultiplier(segments: SegmentV2[]): number {
  if (segments.includes("luxury_invest")) return 1.3;
  if (segments.includes("mid_market")) return 1.0;
  return 0.75;
}

function parseEncoded(encoded: string): { name: string; category: CategoryV2 | null } {
  const i = encoded.lastIndexOf(SEP_V2);
  if (i === -1) return { name: encoded, category: null };
  const label = encoded.slice(i + SEP_V2.length);
  return { name: encoded.slice(0, i), category: CATEGORY_LABEL_TO_KEY[label] ?? null };
}

function fallbackFor(category: CategoryV2 | null, mult: number) {
  const base =
    category === "jewelry"
      ? { low: 2500, high: 4500 }
      : category === "bags"
      ? { low: 3000, high: 5500 }
      : { low: 3500, high: 6500 };
  return { low: base.low * mult, high: base.high * mult };
}

const SPREAD_CAP = 2;
function tighten(r: { low: number; high: number }) {
  if (r.low <= 0) return r;
  const cappedHigh = Math.min(r.high, r.low * SPREAD_CAP);
  return { low: r.low, high: Math.max(cappedHigh, r.low * 1.4) };
}

export type IndicativeRangeV2 = {
  low: number;
  high: number;
  perCategory: Partial<Record<CategoryV2, { low: number; high: number }>>;
};

export type TierResolverV2 = (
  name: string,
  category: CategoryV2 | null,
) => CatalogTierV2 | null;

export function indicativeRangeV2(
  brands: string[],
  segments: SegmentV2[],
  categories: CategoryV2[] = [],
  resolveTier?: TierResolverV2,
): IndicativeRangeV2 {
  const segMult = segmentMultiplier(segments);
  const perCategory: Partial<Record<CategoryV2, { low: number; high: number }>> = {};
  for (const c of categories) perCategory[c] = { low: 0, high: 0 };

  for (const encoded of brands) {
    const { name, category } = parseEncoded(encoded);
    const tier = resolveTier?.(name, category) ?? null;
    const mult = tier ? TIER_MULTIPLIER[tier] : segMult;
    const known = BASE_BRAND_VALUES[name];
    const scaled = known
      ? { low: known.low * mult, high: known.high * mult }
      : fallbackFor(category, mult);
    const bucketCat: CategoryV2 = category ?? categories[0] ?? "watches";
    const prev = perCategory[bucketCat] ?? { low: 0, high: 0 };
    perCategory[bucketCat] = {
      low: prev.low + scaled.low,
      high: prev.high + scaled.high,
    };
  }

  let low = 0;
  let high = 0;
  for (const c of Object.keys(perCategory) as CategoryV2[]) {
    const t = tighten(perCategory[c]!);
    perCategory[c] = t;
    low += t.low;
    high += t.high;
  }
  const headline = tighten({ low, high });
  return { low: headline.low, high: headline.high, perCategory };
}

export function formatCompactUSDV2(n: number): string {
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function personalizationLineV2(
  brands: string[],
  segments: SegmentV2[],
  categories: CategoryV2[],
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
