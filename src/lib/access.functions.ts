// Single server-computed access model.
//
// One call answers "what is this account allowed to see?" so no caller has to
// re-read the profile or guess. Runs server-side because `credentials` can only
// be answered by the Auth admin API.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTrialing } from "@/lib/subscription";

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
  trialing: boolean;
  period: "monthly" | "quarterly" | "annual" | null;
  /** Display only — never gate access on this. */
  billingStatus: BillingStatus;
  /** When access ends; null = no scheduled end. Display only. */
  accessUntil: string | null;
};


export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const userId = context.userId;

    // Privileged client — dynamic import so the server-only module never enters
    // a client bundle.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // `credentials` is read from Auth, never from `profiles`. Every column on
    // `profiles` is self-writable by the row owner under `profiles_update_own`,
    // so a `has_password`-style column would be a flag users could simply set on
    // themselves. Identities are Auth-owned and not user-writable.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const credentials =
      authUser.user?.identities?.some((i) => i.provider !== "anonymous") ?? false;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("plan, billing_period, trial_ends_at, quiz_completed")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const trialing = isTrialing(profile?.trial_ends_at);

    return {
      credentials,
      // A trial is full access, so trialing accounts (plan === "pro") count.
      subscription: profile?.plan === "pro",
      onboarded: profile?.quiz_completed === true,
      trialing,
      period: (profile?.billing_period as AccessState["period"]) ?? null,
    };
  });
