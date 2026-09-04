// Single server-computed access model.
//
// One call answers "what is this account allowed to see?" so no caller has to
// re-read the profile or guess. Runs server-side because `credentials` can only
// be answered by the Auth admin API.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingStatus = "active" | "past_due" | "canceled";

export type AccessState = {
  /** Can this account sign in on its own? */
  credentials: boolean;
  /**
   * THE single answer to "is this account entitled right now".
   *
   * Nothing anywhere should re-derive entitlement from `plan` (or from
   * `billingStatus`): a cancelled account stays entitled until `access_until`
   * passes, and a past-due account is entitled for the whole retry window.
   */
  subscription: boolean;
  /** Quiz saved. */
  onboarded: boolean;
  period: "monthly" | "quarterly" | "annual" | null;
  /** Display only — never gate access on this. */
  billingStatus: BillingStatus;
  /** When access ends; null = no scheduled end. Display only. */
  accessUntil: string | null;
  /**
   * Has this account ever had a subscription? Display only — it picks the
   * copy for "never subscribed" vs "cancelled". Derived server-side; client
   * code must never compute it.
   */
  hasEverSubscribed: boolean;
  /** True when the cancellation came from failed payments, not the user. */
  pastDue: boolean;
};

/**
 * DERIVATION, not a stored fact: true when any positive billing signal exists.
 * If this ever proves wrong, a `first_subscribed_at` column on `profiles`,
 * stamped once at first successful checkout, is the hard answer.
 */
function deriveHasEverSubscribed(p: {
  plan: string | null;
  billing_period: string | null;
  access_until: string | null;
  past_due_since: string | null;
  billing_status: string | null;
}): boolean {
  return (
    p.plan === "pro" ||
    p.billing_period != null ||
    p.access_until != null ||
    p.past_due_since != null ||
    (p.billing_status != null && p.billing_status !== "active")
  );
}


export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const userId = context.userId;

    // Privileged client — dynamic import so the server-only module never enters
    // a client bundle.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // `credentials` is Auth-owned, never read from `profiles`. Every column on
    // `profiles` is self-writable by the row owner, so a `has_password`-style
    // column would be a flag users could set on themselves.
    //
    // It cannot be derived from `identities` either: admin.createUser({ email })
    // with no password still creates an `email` identity, so a webhook-created
    // account would look credentialed. The webhook instead stamps
    // app_metadata.needs_credentials on create. app_metadata is service-role
    // only — user_metadata is writable by the user themselves, which would make
    // the flag forgeable in exactly the way a `profiles` column would be.
    //
    // Absent key => credentials true, so every account that predates this is
    // unaffected and needs no backfill.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const credentials =
      (authUser.user?.app_metadata as { needs_credentials?: boolean } | undefined)
        ?.needs_credentials !== true;


    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "plan, billing_period, quiz_completed, access_until, billing_status, past_due_since",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const accessUntil = profile?.access_until ?? null;

    return {
      credentials,
      // Cancelled accounts keep access until access_until passes; past-due
      // accounts stay entitled for the whole retry window (billing_status is
      // deliberately NOT part of this test).
      subscription:
        profile?.plan === "pro" && (accessUntil == null || new Date(accessUntil) > new Date()),
      onboarded: profile?.quiz_completed === true,
      period: (profile?.billing_period as AccessState["period"]) ?? null,
      billingStatus: (profile?.billing_status as AccessState["billingStatus"]) ?? "active",
      accessUntil,
      hasEverSubscribed: profile
        ? deriveHasEverSubscribed({
            plan: profile.plan ?? null,
            billing_period: profile.billing_period ?? null,
            access_until: profile.access_until ?? null,
            past_due_since: profile.past_due_since ?? null,
            billing_status: profile.billing_status ?? null,
          })
        : false,
      pastDue: profile?.past_due_since != null,
    };

  });
