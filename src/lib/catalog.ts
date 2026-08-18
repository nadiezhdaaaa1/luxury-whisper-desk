// Global brand/model catalog. Read from `brands` and `models` tables.
// Never re-declare a hardcoded brand list — everything reads from here.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Segment } from "@/lib/quiz";

export type Tier = "luxury_invest" | "mid_market" | "mass_market";

export const TIERS: Tier[] = ["luxury_invest", "mid_market", "mass_market"];

export const TIER_LABELS: Record<Tier, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
  mass_market: "Mass-market",
};

export type BrandRow = {
  slug: string;
  name: string;
  category: Category;
  tier: Tier;
};

export type ModelRow = {
  id: string;
  brand_slug: string;
  name: string;
};

// Quiz Step 1 segments map 1:1 to catalog tiers.
export function tiersForSegment(seg: Segment): Tier[] {
  switch (seg) {
    case "luxury_invest":
      return ["luxury_invest"];
    case "mid_market":
      return ["mid_market"];
    case "mass_market":
      return ["mass_market"];
  }
}

export function tierSetForSegments(segs: Segment[]): Set<Tier> {
  const out = new Set<Tier>();
  for (const s of segs) for (const t of tiersForSegment(s)) out.add(t);
  return out;
}

// ---- fetchers ----
export async function fetchAllBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("slug,name,category,tier")
    .order("category")
    .order("tier")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

export async function fetchModelsForBrand(brand_slug: string): Promise<ModelRow[]> {
  const { data, error } = await supabase
    .from("models")
    .select("id,brand_slug,name")
    .eq("brand_slug", brand_slug)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ModelRow[];
}

// ---- React Query hooks ----
export function useBrandsCatalog() {
  return useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: fetchAllBrands,
    staleTime: 1000 * 60 * 60, // 1h
  });
}

export function useModelsForBrand(brand_slug: string | null | undefined) {
  return useQuery({
    queryKey: ["catalog", "models", brand_slug ?? ""],
    queryFn: () => (brand_slug ? fetchModelsForBrand(brand_slug) : Promise.resolve([])),
    enabled: !!brand_slug,
    staleTime: 1000 * 60 * 60,
  });
}

// ---- derived helpers ----
export function brandsByCategory(brands: BrandRow[], cat: Category): BrandRow[] {
  return brands.filter((b) => b.category === cat);
}

export function findBrand(brands: BrandRow[], name: string, cat: Category): BrandRow | undefined {
  return brands.find((b) => b.name === name && b.category === cat);
}

export function findBrandByLabel(
  brands: BrandRow[],
  name: string,
  categoryLabel: string | null,
): BrandRow | undefined {
  if (categoryLabel) {
    const cat = (Object.keys(CATEGORY_LABELS) as Category[]).find(
      (k) => CATEGORY_LABELS[k] === categoryLabel,
    );
    if (cat) return findBrand(brands, name, cat);
  }
  return brands.find((b) => b.name === name);
}

// Encoded-brand helpers (kept in sync with QuizFlow encoding "Name — CategoryLabel").
export const BRAND_SEP = " — ";
export function encodeBrand(name: string, cat: Category): string {
  return `${name}${BRAND_SEP}${CATEGORY_LABELS[cat]}`;
}
export function parseEncodedBrand(encoded: string): {
  name: string;
  categoryLabel: string | null;
  category: Category | null;
} {
  const i = encoded.lastIndexOf(BRAND_SEP);
  if (i === -1) return { name: encoded, categoryLabel: null, category: null };
  const label = encoded.slice(i + BRAND_SEP.length);
  const cat =
    (Object.keys(CATEGORY_LABELS) as Category[]).find((k) => CATEGORY_LABELS[k] === label) ?? null;
  return { name: encoded.slice(0, i), categoryLabel: label, category: cat };
}

// Return all (brand, category) pairs a name matches — a brand may exist in
// multiple categories (e.g. Cartier — Watches / Cartier — Jewelry).
export function brandCategoriesForName(brands: BrandRow[], name: string): Category[] {
  const cats = new Set<Category>();
  for (const b of brands) if (b.name === name) cats.add(b.category);
  return [...cats];
}

// Categories present in the loaded catalog (for iteration safety).
export function catalogCategories(brands: BrandRow[]): Category[] {
  return CATEGORIES.filter((c) => brands.some((b) => b.category === c));
}
