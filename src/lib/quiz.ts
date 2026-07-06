// Shared quiz types, brand catalog, localStorage helpers.
import { z } from "zod";

export const SEGMENTS = ["luxury_invest", "mid_market", "mass_market"] as const;
export const CATEGORIES = ["watches", "jewelry", "bags", "fashion"] as const;
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
  fashion: "Fashion",
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
  fashion: [
    { name: "Loro Piana", segments: ["luxury_invest"] },
    { name: "Brunello Cucinelli", segments: ["luxury_invest"] },
    { name: "The Row", segments: ["luxury_invest"] },
    { name: "Bottega Veneta", segments: ["luxury_invest", "mid_market"] },
    { name: "Zegna", segments: ["mid_market"] },
    { name: "Ralph Lauren", segments: ["mid_market"] },
    { name: "Acne Studios", segments: ["mid_market"] },
    { name: "COS", segments: ["mass_market"] },
    { name: "Uniqlo", segments: ["mass_market"] },
    { name: "Zara", segments: ["mass_market"] },
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
