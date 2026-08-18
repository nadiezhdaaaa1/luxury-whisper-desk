// Storage cleanup for account erasure.
//
// DeleteAccountDialog promises everything is "permanently removed" once the
// 30-day grace period ends. Removing the DB rows is not enough — the user's
// photos live in the private `portfolio-photos` bucket under `<uid>/`.
//
// NOTE: account deletion is currently a localStorage mock (src/lib/account-mock.ts);
// nothing executes the erasure yet. This function is the cleanup step that the
// real deletion job must call — see the TODO in account-mock.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "portfolio-photos";

/** Remove every object under `portfolio-photos/<userId>/`. Server-only. */
export async function purgePortfolioPhotosFor(userId: string): Promise<{ removed: number; ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let removed = 0;
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit, offset });
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
    if (names.length < limit) return { removed, ok: true };
    offset += limit;
  }
}

/** Caller can only ever purge their own folder. */
export const purgeMyPortfolioPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => purgePortfolioPhotosFor(context.userId));
