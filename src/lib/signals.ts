import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BrandRow } from "@/lib/catalog";
import type { Category } from "@/lib/quiz";

export type SignalType = "price_increase" | "new_collection" | "discount" | "drop";
export type SignalCategory = "watches" | "jewelry" | "bags";

export type SignalRow = {
  id: string;
  type: SignalType;
  category: SignalCategory;
  brand_slug: string;
  brand_name: string;
  segment: string | null;
  model: string | null;
  title: string;
  body: string;
  recommended_action: string | null;
  signal_date: string;
  is_sample: boolean;
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  price_increase: "Price increase",
  new_collection: "New collection",
  discount: "Discount",
  drop: "Drop",
};

// Categories visible in the live feed.
export const LIVE_CATEGORIES: SignalCategory[] = ["watches", "jewelry", "bags"];

export async function fetchSignalsForBrands(brandSlugs: string[]): Promise<SignalRow[]> {
  if (brandSlugs.length === 0) return [];
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .in("brand_slug", brandSlugs)
    .order("signal_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SignalRow[];
}

export function useSignalsForBrands(brandSlugs: string[]) {
  const key = [...brandSlugs].sort();
  return useQuery({
    queryKey: ["signals", key],
    queryFn: () => fetchSignalsForBrands(brandSlugs),
    enabled: brandSlugs.length > 0,
    staleTime: 1000 * 60,
  });
}

// Fetch signals for a set of brand slugs regardless of category. Watchlist
// and Portfolio need lookups by slug even for categories not in the live
// feed; UI decides whether to display them (bags stay coming-soon).
export async function fetchSignalsForSlugs(brandSlugs: string[]): Promise<SignalRow[]> {
  if (brandSlugs.length === 0) return [];
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .in("brand_slug", brandSlugs)
    .order("signal_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SignalRow[];
}

export function useSignalsForSlugs(brandSlugs: string[]) {
  const key = [...brandSlugs].sort();
  return useQuery({
    queryKey: ["signals", "slugs", key],
    queryFn: () => fetchSignalsForSlugs(brandSlugs),
    enabled: brandSlugs.length > 0,
    staleTime: 1000 * 60,
  });
}

// Resolve (display name + category) to the catalog brand_slug. Returns null
// for custom brands not present in the catalog.
export function resolveBrandSlug(
  catalog: BrandRow[] | undefined,
  brand: string,
  category: Category,
): string | null {
  if (!catalog) return null;
  const hit = catalog.find((b) => b.name === brand && b.category === category);
  return hit?.slug ?? null;
}

// Pick the most recent signal for a card. `signals` is assumed pre-sorted
// desc by signal_date (as returned by fetchSignalsForSlugs).
// - Brand card (no model): any signal with matching brand_slug.
// - Piece card (model set): only signals with matching brand_slug AND model.
export function pickLastSignal(
  signals: SignalRow[] | undefined,
  args: { brand_slug: string | null; model?: string | null },
): SignalRow | null {
  if (!signals || !args.brand_slug) return null;
  const slug = args.brand_slug;
  const model = args.model?.trim().toLowerCase() || null;
  for (const s of signals) {
    if (s.brand_slug !== slug) continue;
    if (model) {
      if (!s.model) continue;
      if (s.model.trim().toLowerCase() !== model) continue;
    }
    return s;
  }
  return null;
}

// ---- date helpers ----

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateLabel(d: Date): string {
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const now = new Date();
  const sameYear = day.getFullYear() === now.getFullYear();
  const base = `${MONTHS[day.getMonth()]} ${day.getDate()}`;
  return sameYear ? base : `${base}, ${day.getFullYear()}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

export type SignalGroup = { key: string; label: string; items: SignalRow[] };

export function groupByDate(rows: SignalRow[]): SignalGroup[] {
  const buckets = new Map<string, SignalRow[]>();
  for (const r of rows) {
    const d = new Date(r.signal_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(r);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([key, items]) => ({
      key,
      label: dateLabel(new Date(items[0].signal_date)),
      items,
      sortAt: new Date(items[0].signal_date).getTime(),
    }))
    .sort((a, b) => b.sortAt - a.sortAt)
    .map(({ key, label, items }) => ({ key, label, items }));
}
