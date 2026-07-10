// Portfolio domain: types & CRUD helpers.
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/lib/quiz";

export const FREE_PORTFOLIO_CAP = 3;
export const PORTFOLIO_BUCKET = "portfolio-photos";

export type PortfolioRow = {
  id: string;
  user_id: string;
  category: Category;
  brand: string;
  model: string | null;
  photo_url: string | null;
  notes: string | null;
  purchase_price: number | null;
  currency: string;
  signal_every_move: boolean;
  alert_below_enabled: boolean;
  alert_below_price: number | null;
  alert_above_enabled: boolean;
  alert_above_price: number | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioInput = {
  category: Category;
  brand: string;
  model?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  purchase_price?: number | null;
  currency?: string;
  signal_every_move?: boolean;
  alert_below_enabled?: boolean;
  alert_below_price?: number | null;
  alert_above_enabled?: boolean;
  alert_above_price?: number | null;
};

export async function fetchPortfolio(): Promise<PortfolioRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PortfolioRow[];
}

export async function insertPortfolioItem(input: PortfolioInput): Promise<PortfolioRow> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const payload = {
    user_id: auth.user.id,
    category: input.category,
    brand: input.brand,
    model: input.model ?? null,
    photo_url: input.photo_url ?? null,
    notes: input.notes ?? null,
    purchase_price: input.purchase_price ?? null,
    currency: input.currency ?? "USD",
    signal_every_move: input.signal_every_move ?? false,
    alert_below_enabled: input.alert_below_enabled ?? false,
    alert_below_price: input.alert_below_price ?? null,
    alert_above_enabled: input.alert_above_enabled ?? false,
    alert_above_price: input.alert_above_price ?? null,
  };
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as PortfolioRow;
}

export async function updatePortfolioItem(id: string, patch: Partial<PortfolioInput>): Promise<void> {
  const { error } = await supabase.from("portfolio_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (error) throw error;
}

// Upload a photo into user's folder in the private bucket, return a signed URL good for a year.
export async function uploadPortfolioPhoto(file: File): Promise<{ path: string; url: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data: signed, error: signErr } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return { path, url: signed.signedUrl };
}

// Sum of purchase prices; also returns coverage counts.
export function computeTotals(rows: PortfolioRow[]) {
  const priced = rows.filter((r) => r.purchase_price != null && Number.isFinite(Number(r.purchase_price)));
  const total = priced.reduce((s, r) => s + Number(r.purchase_price ?? 0), 0);
  return { total, pricedCount: priced.length, totalCount: rows.length };
}

export function portfolioCapFor(plan: "free" | "pro" | undefined): number {
  return plan === "pro" ? Number.POSITIVE_INFINITY : FREE_PORTFOLIO_CAP;
}
