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
  photo_path: string | null;
  /** Transient, freshly signed URL for display. Never persisted. */
  photo_signed_url?: string | null;
  notes: string | null;
  purchase_price: number | null;
  purchase_year: number | null;
  target_price: number | null;
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
  photo_path?: string | null;
  notes?: string | null;
  purchase_price?: number | null;
  purchase_year?: number | null;
  target_price?: number | null;
  currency?: string;
  signal_every_move?: boolean;
  alert_below_enabled?: boolean;
  alert_below_price?: number | null;
  alert_above_enabled?: boolean;
  alert_above_price?: number | null;
};

/** Display URL for a row: freshly signed when available, legacy long-lived URL otherwise. */
export function portfolioPhotoSrc(row: Pick<PortfolioRow, "photo_signed_url" | "photo_url">): string | null {
  return row.photo_signed_url ?? row.photo_url ?? null;
}

/** Extract the storage path out of a legacy persisted signed URL. */
export function pathFromSignedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/object\/sign\/portfolio-photos\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}


const SIGNED_URL_TTL = 60 * 60; // 1 hour — signed on read, never persisted.

export async function fetchPortfolio(): Promise<PortfolioRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as PortfolioRow[];
  return await withSignedPhotos(rows);
}

/** Batch-sign every row that has a storage path. Falls back to the legacy URL on failure. */
export async function withSignedPhotos(rows: PortfolioRow[]): Promise<PortfolioRow[]> {
  const paths = [...new Set(rows.map((r) => r.photo_path).filter((p): p is string => !!p))];
  if (paths.length === 0) return rows;
  try {
    const { data, error } = await supabase.storage
      .from(PORTFOLIO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) return rows;
    const map = new Map<string, string>();
    data.forEach((d, i) => {
      const p = d.path ?? paths[i];
      if (p && d.signedUrl) map.set(p, d.signedUrl);
    });
    return rows.map((r) =>
      r.photo_path && map.has(r.photo_path)
        ? { ...r, photo_signed_url: map.get(r.photo_path)! }
        : r,
    );
  } catch (e) {
    console.error("[portfolio] signing photo urls failed", e);
    return rows;
  }
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
    photo_path: input.photo_path ?? null,
    notes: input.notes ?? null,
    purchase_price: input.purchase_price ?? null,
    purchase_year: input.purchase_year ?? null,
    target_price: input.target_price ?? null,
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

/** Best-effort removal of storage objects. Never throws. Returns true when all were removed. */
export async function deletePortfolioPhotos(paths: (string | null | undefined)[]): Promise<boolean> {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (list.length === 0) return true;
  try {
    const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).remove(list);
    if (error) {
      console.error("[portfolio] storage remove failed", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[portfolio] storage remove threw", e);
    return false;
  }
}

export async function deletePortfolioPhoto(path: string | null | undefined): Promise<boolean> {
  return deletePortfolioPhotos([path]);
}

/**
 * Remove a piece. Storage FIRST — once the row is gone the path is unrecoverable.
 * A storage failure never blocks removal; it is reported back so the UI can be honest.
 */
export async function deletePortfolioItem(id: string): Promise<{ photoRemoved: boolean }> {
  const { data } = await supabase
    .from("portfolio_items")
    .select("photo_path, photo_url")
    .eq("id", id)
    .maybeSingle();
  const path = data?.photo_path ?? pathFromSignedUrl(data?.photo_url);
  const photoRemoved = path ? await deletePortfolioPhotos([path]) : true;
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (error) throw error;
  return { photoRemoved };
}

/** Bulk remove: one storage call, one row delete. */
export async function deletePortfolioItems(ids: string[]): Promise<{ photosRemoved: boolean }> {
  if (ids.length === 0) return { photosRemoved: true };
  const { data } = await supabase
    .from("portfolio_items")
    .select("photo_path, photo_url")
    .in("id", ids);
  const paths = (data ?? []).map((r) => r.photo_path ?? pathFromSignedUrl(r.photo_url));
  const photosRemoved = await deletePortfolioPhotos(paths);
  const { error } = await supabase.from("portfolio_items").delete().in("id", ids);
  if (error) throw error;
  return { photosRemoved };
}

// Upload a photo into user's folder in the private bucket. The path is the source of
// truth; the returned URL is short-lived and only for immediate preview.
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
    .createSignedUrl(path, SIGNED_URL_TTL);
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
