// Credential setup for accounts created by the billing webhook.
//
// The `needs_credentials` flag lives in app_metadata (service-role only) and is
// NEVER cleared by the client: each clear here is tied to the act it attests,
// so the flag cannot be dropped without the credential actually existing.
//
// This gate is a funnel signal, not a security boundary — the purchase is
// attached to the account either way — but tying the clear to the act keeps it
// honest and stops the screen being trivially skippable.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Matches the minimum enforced on signup.tsx. */
const MIN_PASSWORD = 8;

function parsePassword(input: unknown): { password: string } {
  const password = (input as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    throw new Error(`Use at least ${MIN_PASSWORD} characters`);
  }
  return { password };
}

/**
 * Sets the password AND clears the flag in one handler.
 *
 * The user is derived from the verified bearer token (context.userId); no email
 * is read from the request at all, so the account's address cannot diverge from
 * what the subscription was bought under. The password is never logged.
 */
export const setAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parsePassword)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    // A rejected password is ordinary user input, not a server fault: return it
    // so the form can show it inline instead of throwing past the boundary.
    if (error) return { ok: false as const, message: error.message };

    // Setting a key to null removes it from app_metadata.
    const { error: mErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      app_metadata: { needs_credentials: null },
    });
    if (mErr) throw new Error(mErr.message);

    return { ok: true as const };
  });

export type LinkConfirmation =
  | { ok: true }
  | { ok: false; reason: "no_identity" }
  | { ok: false; reason: "email_mismatch"; accountEmail: string; linkedEmail: string; identityId: string };

/**
 * Called after a client-side linkIdentity() round trip. VERIFIES before it
 * clears: the flag is only dropped when a non-email identity is actually on the
 * account. No link, no clear.
 */
export const confirmIdentityLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LinkConfirmation> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    const user = data.user;
    const linked = user?.identities?.find((i) => i.provider !== "email");
    if (!linked) return { ok: false, reason: "no_identity" };

    const accountEmail = (user?.email ?? "").toLowerCase();
    const linkedEmail = String(
      (linked.identity_data as { email?: unknown } | undefined)?.email ?? "",
    ).toLowerCase();
    if (linkedEmail && accountEmail && linkedEmail !== accountEmail) {
      return {
        ok: false,
        reason: "email_mismatch",
        accountEmail,
        linkedEmail,
        identityId: linked.identity_id ?? "",
      };
    }

    const { error: mErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      app_metadata: { needs_credentials: null },
    });
    if (mErr) throw new Error(mErr.message);

    return { ok: true };
  });

/** The account email, for display on the credentials screen. */
export const getAccountEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return { email: data.user?.email ?? "" };
  });
