// V3 quiz — fully independent copy of src/lib/quiz.ts.
// Do NOT share state with V1; changes here must not affect V1.
import { z } from "zod";

export const SEGMENTS_V3 = ["luxury_invest", "mid_market"] as const;
export const CATEGORIES_V3 = ["watches", "jewelry", "bags"] as const;
export const ROLES_V3 = ["collector", "reseller", "buyer"] as const;

export type SegmentV3 = (typeof SEGMENTS_V3)[number];
export type CategoryV3 = (typeof CATEGORIES_V3)[number];
export type RoleV3 = (typeof ROLES_V3)[number];

export type QuizAnswersV3 = {
  categories: CategoryV3[];
  brands: string[];
  segments: SegmentV3[]; // inferred from brand picks
  role: RoleV3 | null;
  email?: string;
};

export const EMPTY_ANSWERS_V3: QuizAnswersV3 = {
  categories: [],
  brands: [],
  segments: [],
  role: null,
};

/**
 * Payload sanity bound, NOT a product limit. There is no cap on how many
 * brands a user may follow — this only stops an unbounded array arriving
 * from the client. The catalog holds ~30 entries and users can add custom
 * brands, so this sits far above any real selection.
 */
export const MAX_BRANDS_PAYLOAD_V3 = 500;

export const quizAnswersSchemaV3 = z.object({
  segments: z.array(z.enum(SEGMENTS_V3)).min(1),
  categories: z.array(z.enum(CATEGORIES_V3)).min(1),
  brands: z.array(z.string().trim().min(1).max(80)).min(1).max(MAX_BRANDS_PAYLOAD_V3),
  role: z.enum(ROLES_V3),
});
export type QuizAnswersV3Payload = z.infer<typeof quizAnswersSchemaV3>;

export const SEGMENT_LABELS_V3: Record<SegmentV3, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
};

export const CATEGORY_LABELS_V3: Record<CategoryV3, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

export const ROLE_LABELS_V3: Record<RoleV3, string> = {
  collector: "Collector",
  reseller: "Reseller",
  buyer: "Buyer for myself",
};

// Encoded brand: "Name — CategoryLabel" (same shape V1 uses so profile writes stay compatible).
export const SEP_V3 = " — ";
export function encodeBrandV3(name: string, cat: CategoryV3): string {
  return `${name}${SEP_V3}${CATEGORY_LABELS_V3[cat]}`;
}
export function brandCategoryLabelV3(b: string): string | null {
  const i = b.lastIndexOf(SEP_V3);
  return i === -1 ? null : b.slice(i + SEP_V3.length);
}
export function brandDisplayNameV3(b: string): string {
  const i = b.lastIndexOf(SEP_V3);
  return i === -1 ? b : b.slice(0, i);
}

// ---- localStorage draft (separate key from V1) ----
const KEY_V3 = "lux_quiz_draft_v3";

export function readDraftV3(): QuizAnswersV3 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_V3);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizAnswersV3>;
    const hadEmail = typeof parsed.email === "string";
    const cleaned: QuizAnswersV3 = {
      categories: (parsed.categories ?? []).filter((c): c is CategoryV3 =>
        (CATEGORIES_V3 as readonly string[]).includes(c),
      ),
      brands: Array.isArray(parsed.brands)
        ? parsed.brands.filter((b) => typeof b === "string")
        : [],
      segments: (parsed.segments ?? []).filter((s): s is SegmentV3 =>
        (SEGMENTS_V3 as readonly string[]).includes(s),
      ),
      role:
        parsed.role && (ROLES_V3 as readonly string[]).includes(parsed.role)
          ? (parsed.role as RoleV3)
          : null,
    };
    // Legacy drafts may contain an email — drop it and rewrite immediately.
    if (hadEmail) writeDraftV3(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

export function writeDraftV3(answers: QuizAnswersV3): void {
  if (typeof window === "undefined") return;
  try {
    // `email` is session-only and is never persisted.
    const { categories, brands, segments, role } = answers;
    window.localStorage.setItem(KEY_V3, JSON.stringify({ categories, brands, segments, role }));
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraftV3(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_V3);
  } catch {
    /* ignore */
  }
}

export function draftIsCompleteV3(a: QuizAnswersV3 | null): a is QuizAnswersV3 & {
  role: RoleV3;
} {
  return !!a && a.categories.length > 0 && a.brands.length > 0 && a.segments.length > 0 && !!a.role;
}
