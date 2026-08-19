import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sourceHostname, useMutedSources } from "@/lib/muted-sources";
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
  source_url: string | null;
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

// ---- weekly alert count (aha screen) ----
//
// Counts signals for the given catalog brand slugs over the last 7 days and
// reports whether EVERY counted row is real (i.e. `is_sample = false`).
// The aha screen only renders the number when `allReal` is true, so the count
// starts being shown automatically once the source parser writes non-sample
// rows into `public.signals`. No UI change is needed at that point.
export type WeeklySignalCount = { count: number; allReal: boolean };

export async function fetchWeeklySignalCount(brandSlugs: string[]): Promise<WeeklySignalCount> {
  if (brandSlugs.length === 0) return { count: 0, allReal: false };
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("signals")
    .select("is_sample")
    .in("brand_slug", brandSlugs)
    .gte("signal_date", since);
  if (error) throw error;
  const rows = (data ?? []) as { is_sample: boolean }[];
  return { count: rows.length, allReal: rows.length > 0 && rows.every((r) => !r.is_sample) };
}

/** Hook form. Disabled (and therefore never blocking) when no slugs resolve. */
export function useWeeklySignalCount(brandSlugs: string[]) {
  const key = [...brandSlugs].sort();
  return useQuery({
    queryKey: ["signals", "weekly-count", key],
    queryFn: () => fetchWeeklySignalCount(brandSlugs),
    enabled: brandSlugs.length > 0,
    staleTime: 1000 * 60,
  });
}

export type SignalsResult = {
  /** Fetched signals with muted sources already removed. Every surface —
   *  lists AND counters — must derive from this, never from `query.data`,
   *  or the numbers disagree with what the feed actually shows. */
  signals: SignalRow[];
  /** Per-host tally of what the mute filter removed, for the unmute banner. */
  hiddenBySource: Map<string, number>;
  query: ReturnType<typeof useQuery<SignalRow[]>>;
};

/** Single fetch + mute seam for signals. `useMutedSources` reads localStorage
 *  through a useState initializer + effect sync, so SSR sees an empty mute
 *  list and the filter settles after hydration rather than mismatching. */
export function useSignals(brandSlugs: string[]): SignalsResult {
  const key = [...brandSlugs].sort();
  const query = useQuery({
    queryKey: ["signals", key],
    queryFn: () => fetchSignalsForBrands(brandSlugs),
    enabled: brandSlugs.length > 0,
    staleTime: 1000 * 60,
  });

  const muted = useMutedSources();
  const mutedSet = useMemo(() => new Set(muted), [muted]);

  const { signals, hiddenBySource } = useMemo(() => {
    const rows = query.data ?? [];
    const visible: SignalRow[] = [];
    const hidden = new Map<string, number>();
    for (const s of rows) {
      const host = sourceHostname(s.source_url);
      if (host && mutedSet.has(host)) {
        hidden.set(host, (hidden.get(host) ?? 0) + 1);
      } else {
        visible.push(s);
      }
    }
    return { signals: visible, hiddenBySource: hidden };
  }, [query.data, mutedSet]);

  return { signals, hiddenBySource, query };
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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
