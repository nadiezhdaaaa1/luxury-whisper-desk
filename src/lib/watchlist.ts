// Watchlist domain: types, seeding, and CRUD helpers.
// Brand/model catalog now lives in `@/lib/catalog` (backed by the DB).
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import type { BrandRow, Tier } from "@/lib/catalog";



export type WatchlistItemType = "brand" | "piece";

export type WatchlistRow = {
  id: string;
  user_id: string;
  type: WatchlistItemType;
  category: Category;
  brand: string;
  model: string | null;
  target_price: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Display labels for the 4 catalog tiers used in filter chips.
export const TIER_LABELS: Record<Tier, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
  mass_market: "Mass-market",
};

// Given catalog rows, which categories a brand (by display name) belongs to.
export function brandCategories(catalog: BrandRow[], brand: string): Category[] {
  const out = new Set<Category>();
  for (const b of catalog) if (b.name === brand) out.add(b.category);
  return [...out];
}

// ---- CRUD ----

export async function fetchWatchlist(): Promise<WatchlistRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WatchlistRow[];
}

export async function insertItems(
  rows: Array<
    Pick<WatchlistRow, "type" | "category" | "brand"> &
      Partial<Pick<WatchlistRow, "model" | "target_price" | "currency" | "is_active">>
  >,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const payload = rows.map((r) => ({
    user_id: auth.user!.id,
    type: r.type,
    category: r.category,
    brand: r.brand,
    model: r.model ?? null,
    target_price: r.target_price ?? null,
    currency: r.currency ?? "USD",
    is_active: r.is_active ?? true,
  }));
  const { error } = await supabase.from("watchlist").insert(payload);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) throw error;
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<WatchlistRow, "is_active" | "target_price" | "currency" | "model">>,
): Promise<void> {
  const { error } = await supabase.from("watchlist").update(patch).eq("id", id);
  if (error) throw error;
}

// Seeding: pick order stable by category then catalog order (already sorted).
// Every seeded row is Active — there is no plan cap, and `is_active` is now
// purely a pause the user chooses themselves. Ordering is therefore cosmetic:
// no row's active/paused state depends on where it lands in this list.
export function planSeedFromProfile(
  profileBrands: string[],
  profileCategories: Category[],
  catalog: BrandRow[],
): Array<{ type: "brand"; category: Category; brand: string; is_active: boolean }> {
  const decoded = profileBrands.map((b) => {
    const idx = b.indexOf(" — ");
    if (idx === -1) return { name: b, categoryLabel: null as string | null };
    return { name: b.slice(0, idx), categoryLabel: b.slice(idx + 3) };
  });

  const seen = new Set<string>();
  const seeds: Array<{ type: "brand"; category: Category; brand: string }> = [];
  for (const c of CATEGORIES) {
    if (!profileCategories.includes(c)) continue;
    const label = CATEGORY_LABELS[c];
    for (const entry of catalog.filter((b) => b.category === c)) {
      const match = decoded.some(
        (d) => d.name === entry.name && (d.categoryLabel === null || d.categoryLabel === label),
      );
      if (!match) continue;
      const key = `${c}::${entry.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seeds.push({ type: "brand", category: c, brand: entry.name });
    }
  }
  // Also include any brand names the profile has that aren't in the catalog
  // (custom brands typed by the user during the quiz).
  for (const d of decoded) {
    const cat =
      (Object.keys(CATEGORY_LABELS) as Category[]).find(
        (k) => CATEGORY_LABELS[k] === d.categoryLabel,
      ) ?? profileCategories[0];
    if (!cat) continue;
    const key = `${cat}::${d.name}`;
    if (seen.has(key)) continue;
    // only include if not already in catalog under that category
    if (catalog.some((b) => b.name === d.name && b.category === cat)) continue;
    seen.add(key);
    seeds.push({ type: "brand", category: cat, brand: d.name });
  }
  return seeds.map((s) => ({ ...s, is_active: true }));
}

