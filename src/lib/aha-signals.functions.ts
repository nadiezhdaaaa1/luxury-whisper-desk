// Example alerts for the public post-quiz reveal.
//
// `public.signals` has RLS with a single SELECT policy scoped to
// `authenticated`; the reveal is anonymous, so a client-side query returns
// `200 []` — silently empty. This anon-callable server function reads the
// table with service credentials instead.
//
// SECURITY: the `is_sample = true` filter is REQUIRED and must not be removed.
// Returning real signals here would let an anonymous caller detect whether the
// product has observed market data yet — an explicitly rejected design (see
// docs/AHA_SCREEN_DATA.md). Sample-only closes that.
import { createServerFn } from "@tanstack/react-start";

export type ExampleAlert = {
  id: string;
  type: "price_increase" | "new_collection" | "discount" | "drop";
  category: "watches" | "jewelry" | "bags";
  brand_name: string;
  model: string | null;
  title: string;
  body: string;
  recommended_action: string | null;
  /** Hostname only — the client must not link off-site. */
  source_host: string | null;
};

const MAX_SLUGS = 25;
const MAX_SLUG_LEN = 100;
const MAX_ROWS = 3;

function parseInput(input: unknown): { brandSlugs: string[] } {
  const raw = (input as { brandSlugs?: unknown } | null)?.brandSlugs;
  if (!Array.isArray(raw)) return { brandSlugs: [] };
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const s = v.slice(0, MAX_SLUG_LEN);
    if (s.length === 0 || out.includes(s)) continue;
    out.push(s);
    if (out.length >= MAX_SLUGS) break;
  }
  return { brandSlugs: out };
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export const getExampleAlerts = createServerFn({ method: "POST" })
  .inputValidator(parseInput)
  .handler(async ({ data }): Promise<ExampleAlert[]> => {
    if (data.brandSlugs.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("signals")
      .select("id, type, category, brand_name, model, title, body, recommended_action, source_url")
      .in("brand_slug", data.brandSlugs)
      .eq("is_sample", true)
      // Deterministic ordering so SSR and hydration agree. No randomness.
      .order("signal_date", { ascending: false })
      .order("id", { ascending: true })
      .limit(60);
    if (error) {
      console.error("[aha-signals] query failed", error.message);
      return [];
    }

    const all = (rows ?? []) as Array<{
      id: string;
      type: ExampleAlert["type"];
      category: ExampleAlert["category"];
      brand_name: string;
      model: string | null;
      title: string;
      body: string;
      recommended_action: string | null;
      source_url: string | null;
    }>;

    // Diversify by type: at most one per type first, then fill with the most
    // recent remaining rows.
    const picked: typeof all = [];
    const seenTypes = new Set<string>();
    for (const r of all) {
      if (picked.length >= MAX_ROWS) break;
      if (seenTypes.has(r.type)) continue;
      seenTypes.add(r.type);
      picked.push(r);
    }
    for (const r of all) {
      if (picked.length >= MAX_ROWS) break;
      if (picked.some((p) => p.id === r.id)) continue;
      picked.push(r);
    }

    return picked.map((r) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      brand_name: r.brand_name,
      model: r.model,
      title: r.title,
      body: r.body,
      recommended_action: r.recommended_action,
      source_host: hostnameOf(r.source_url),
    }));
  });
