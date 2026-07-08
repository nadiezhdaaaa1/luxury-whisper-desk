// Watchlist domain: types, catalogs, seeding, and CRUD helpers.
import { supabase } from "@/integrations/supabase/client";
import { BRAND_CATALOG, CATEGORIES, CATEGORY_LABELS, type Category, type Segment } from "@/lib/quiz";

// Marketing-tunable free-tier cap (total active items). Change here only.
export const FREE_ACTIVE_CAP = 3;

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

// Turn a Segment into a display tier label used in the "Add a brand" filter row.
export const TIER_LABELS: Record<Segment, string> = {
  luxury_invest: "Luxury / Investment",
  mid_market: "Mid-market",
  mass_market: "Mass-market",
};

// Resolve which categories a brand belongs to (a brand can be in multiple).
export function brandCategories(brand: string): Category[] {
  const out: Category[] = [];
  for (const c of CATEGORIES) {
    if (BRAND_CATALOG[c].some((b) => b.name === brand)) out.push(c);
  }
  return out;
}

// Get the tier segments for a (brand, category) pair.
export function brandSegments(brand: string, category: Category): Segment[] {
  return BRAND_CATALOG[category].find((b) => b.name === brand)?.segments ?? [];
}

// Piece / model catalog — small starter set per brand. Not exhaustive; extend later.
export const MODEL_CATALOG: Record<string, string[]> = {
  // Watches
  Rolex: ["Submariner", "Daytona", "GMT-Master II", "Datejust", "Explorer", "Sky-Dweller"],
  "Patek Philippe": ["Nautilus 5711", "Aquanaut 5167", "Calatrava", "Grand Complications"],
  "Audemars Piguet": ["Royal Oak 15500", "Royal Oak Offshore", "Code 11.59"],
  "Richard Mille": ["RM 011", "RM 35-02", "RM 67-02"],
  Omega: ["Speedmaster Professional", "Seamaster 300M", "Constellation", "Aqua Terra"],
  Cartier: ["Tank Louis", "Santos", "Ballon Bleu", "Panthère", "Love Bracelet", "Juste un Clou"],
  IWC: ["Portugieser", "Pilot's Watch", "Portofino", "Aquatimer"],
  "TAG Heuer": ["Carrera", "Monaco", "Aquaracer", "Formula 1"],
  Tudor: ["Black Bay 58", "Pelagos", "Black Bay GMT", "Royal"],
  Breitling: ["Navitimer", "Superocean", "Chronomat", "Avenger"],
  Seiko: ["Prospex Turtle", "Presage Cocktail", "5 Sports", "Alpinist"],
  Casio: ["G-Shock DW-5600", "Oceanus", "Edifice", "Pro Trek"],
  // Jewelry
  "Van Cleef & Arpels": ["Alhambra Necklace", "Perlée Bracelet", "Frivole Ring"],
  Bvlgari: ["B.zero1 Ring", "Serpenti Bracelet", "Divas' Dream"],
  "Tiffany & Co.": ["T Bracelet", "HardWear Necklace", "Return to Tiffany"],
  Boucheron: ["Quatre Ring", "Serpent Bohème"],
  "David Yurman": ["Cable Bracelet", "Renaissance Ring"],
  Mejuri: ["Bold Hoops", "Croissant Dôme"],
  Pandora: ["Moments Bracelet", "Signature Ring"],
  // Bags
  Hermès: ["Birkin 25", "Birkin 30", "Kelly 25", "Kelly 28", "Constance", "Evelyne"],
  Chanel: ["Classic Flap Medium", "Boy Bag", "19 Bag", "Deauville Tote"],
  "Louis Vuitton": ["Neverfull MM", "Speedy 30", "Alma BB", "Capucines BB"],
  Dior: ["Lady Dior", "Book Tote", "Saddle Bag", "Bobby"],
  Goyard: ["Saint Louis PM", "Anjou Mini", "Artois PM"],
  Gucci: ["Marmont Matelassé", "Jackie 1961", "Bamboo 1947"],
  Prada: ["Galleria Saffiano", "Re-Edition 2005", "Cleo"],
  "Saint Laurent": ["Loulou", "Sac de Jour", "Kate", "Envelope"],
  Coach: ["Tabby 26", "Willow Tote", "Rogue 25"],
  "Michael Kors": ["Jet Set Tote", "Cece Shoulder", "Bradshaw"],
};

export function modelsForBrand(brand: string): string[] {
  return MODEL_CATALOG[brand] ?? [];
}

export function allBrandsForCategory(cat: Category): { name: string; segments: Segment[] }[] {
  return BRAND_CATALOG[cat];
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
  rows: Array<Pick<WatchlistRow, "type" | "category" | "brand"> & Partial<Pick<WatchlistRow, "model" | "target_price" | "currency" | "is_active">>>,
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

export async function updateItem(id: string, patch: Partial<Pick<WatchlistRow, "is_active" | "target_price" | "currency" | "model">>): Promise<void> {
  const { error } = await supabase.from("watchlist").update(patch).eq("id", id);
  if (error) throw error;
}

// Seeding: pick order stable by category then catalog order. First cap = Active, rest = Paused.
export function planSeedFromProfile(
  profileBrands: string[],
  profileCategories: Category[],
  cap: number,
): Array<{ type: "brand"; category: Category; brand: string; is_active: boolean }> {
  // Quiz encodes brands as `${name} — ${CategoryLabel}` (e.g. "Rolex — Watches").
  // Legacy profiles may store bare names. Decode both.
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
    for (const entry of BRAND_CATALOG[c]) {
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
  return seeds.map((s, i) => ({ ...s, is_active: i < cap }));
}

// Given the current list, decide auto-promotion after a removal: return the paused item that
// should become active (oldest paused by created_at). Returns null if nothing to promote.
export function pickPromotion(rows: WatchlistRow[], activeCap: number): WatchlistRow | null {
  const active = rows.filter((r) => r.is_active);
  if (active.length >= activeCap) return null;
  const paused = rows
    .filter((r) => !r.is_active)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return paused[0] ?? null;
}

export function activeCapFor(plan: "free" | "pro" | undefined): number {
  return plan === "pro" ? Number.POSITIVE_INFINITY : FREE_ACTIVE_CAP;
}
