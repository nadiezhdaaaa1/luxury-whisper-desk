// Server-side account deletion request / cancel / read.
//
// State lives in public.account_deletion_requests, NOT localStorage, so a
// request made on a phone is visible (and cancellable) on a laptop.
// The row has no FK to auth.users on purpose: it must survive the erasure it
// records, as a uuid + timestamps audit trail with no personal data.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GRACE_PERIOD_DAYS, type DeletionRequest } from "@/lib/account-deletion";

const COLS = "user_id, requested_at, delete_after, cancelled_at, executed_at, status";

export const getMyDeletionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeletionRequest | null> => {
    const { data, error } = await context.supabase
      .from("account_deletion_requests")
      .select(COLS)
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as DeletionRequest | null) ?? null;
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reason?: string }) => ({
    reason: typeof input?.reason === "string" ? input.reason.slice(0, 280) : undefined,
  }))
  .handler(async ({ data, context }): Promise<DeletionRequest> => {
    const now = new Date();
    const deleteAfter = new Date(now);
    deleteAfter.setDate(deleteAfter.getDate() + GRACE_PERIOD_DAYS);

    // Upsert: re-requesting after a cancel restarts the window on the same row.
    const { data: row, error } = await context.supabase
      .from("account_deletion_requests")
      .upsert(
        {
          user_id: context.userId,
          requested_at: now.toISOString(),
          delete_after: deleteAfter.toISOString(),
          cancelled_at: null,
          executed_at: null,
          last_error: null,
          reason: data.reason ?? null,
          status: "pending",
        },
        { onConflict: "user_id" },
      )
      .select(COLS)
      .single();
    if (error) throw new Error(error.message);
    return row as DeletionRequest;
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("account_deletion_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        // The free-text reason is the only user-authored field here; drop it
        // as soon as it stops being needed.
        reason: null,
      })
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
