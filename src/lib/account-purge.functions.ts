// Storage cleanup for account erasure.
//
// DeleteAccountDialog promises everything is "permanently removed" once the
// 30-day grace period ends. Removing the DB rows is not enough — the user's
// photos live in the private `portfolio-photos` bucket under `<uid>/`.
//
// This is the cleanup step the scheduled erasure job calls before deleting the
// auth user — see src/routes/api/public/run-account-deletions.ts. A failure here
// blocks the auth delete on purpose: photos must never outlive the account.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "portfolio-photos";

/**
 * Remove every object under `portfolio-photos/<userId>/`. Server-only.
 *
 * Always lists from offset 0: each pass deletes what it listed, so the
 * remaining objects shift forward. Advancing an offset would skip them.
 */
export async function purgePortfolioPhotosFor(userId: string): Promise<{ removed: number; ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let removed = 0;
  const limit = 100;
  const MAX_PASSES = 200; // safety bound: 20k objects, and stops a failure loop
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit, offset: 0 });
    if (error) {
      console.error("[account-purge] list failed", error);
      return { removed, ok: false };
    }
    const names = (data ?? []).map((o) => `${userId}/${o.name}`);
    if (names.length === 0) return { removed, ok: true };
    const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(names);
    if (rmErr) {
      console.error("[account-purge] remove failed", rmErr);
      return { removed, ok: false };
    }
    removed += names.length;
  }
  console.error("[account-purge] hit max passes; folder may still hold objects", { userId, removed });
  return { removed, ok: false };
}


/** Caller can only ever purge their own folder. */
export const purgeMyPortfolioPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => purgePortfolioPhotosFor(context.userId));
