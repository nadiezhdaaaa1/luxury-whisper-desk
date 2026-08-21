// The ONE place that writes paid plan state.
//
// Both callers go through here:
//   - src/lib/mock-provision.functions.ts  (the mock checkout return path)
//   - src/routes/api/public/billing-webhook.ts  (the Stripe seam)
//
// It must stay a single copy: two versions of the plan patch will drift, and
// every write has to go through supabaseAdmin (service_role) because
// public.enforce_plan_immutable() raises 42501 when a non-privileged caller
// changes plan, billing_period or trial_ends_at.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TRIAL_DAYS } from "@/lib/subscription";

/** "trial" = free-trial start; the others are paid billing periods. */
export type ProvisionPlan = "trial" | "monthly" | "quarterly" | "annual";

export function parseProvisionPlan(v: unknown): ProvisionPlan | null {
  return v === "trial" || v === "monthly" || v === "quarterly" || v === "annual" ? v : null;
}

/** Grant Pro. Trial starts a clock; a paid period clears it. */
export async function provisionPlan(userId: string, plan: ProvisionPlan): Promise<void> {
  // A new checkout supersedes any earlier cancellation or dunning state.
  const entitlement = {
    billing_status: "active",
    past_due_since: null,
    access_until: null,
  };

  const patch =
    plan === "trial"
      ? {
          plan: "pro",
          billing_period: "monthly",
          trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          ...entitlement,
        }
      : {
          plan: "pro",
          billing_period: plan,
          trial_ends_at: null,
          ...entitlement,
        };

  const { error: pErr } = await supabaseAdmin
    .from("profiles")
    .update(patch as never)
    .eq("id", userId);
  if (pErr) throw new Error(pErr.message);

  // Lifting the gate brings paused watchlist rows back. Scoped to this user.
  const { error: wErr } = await supabaseAdmin
    .from("watchlist")
    .update({ is_active: true })
    .eq("user_id", userId)
    .eq("is_active", false);
  if (wErr) throw new Error(wErr.message);
}

/**
 * First real invoice paid — the trial is over, the plan/period stay as they are.
 * This is also the recovery path out of dunning: a successful charge clears
 * past-due state and any scheduled end of access.
 */
export async function clearTrial(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      trial_ends_at: null,
      billing_status: "active",
      past_due_since: null,
      access_until: null,
    } as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * A charge failed. Retries deliver invoice.payment_failed repeatedly, so
 * past_due_since is stamped ONLY when it is currently null — otherwise the
 * grace period would restart on every retry and never expire.
 * access_until is deliberately untouched: the account stays entitled.
 */
export async function markPastDue(userId: string): Promise<void> {
  const { data, error: rErr } = await supabaseAdmin
    .from("profiles")
    .select("past_due_since")
    .eq("id", userId)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);

  const patch: Record<string, unknown> = { billing_status: "past_due" };
  if (!data?.past_due_since) patch["past_due_since"] = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(patch as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Subscription cancelled. `plan` stays 'pro' on purpose — entitlement is now
 * expressed by access_until, not by downgrading the plan.
 */
export async function cancelSubscription(
  userId: string,
  accessUntilIso: string | null,
): Promise<string> {
  const accessUntil = accessUntilIso ?? new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      billing_status: "canceled",
      access_until: accessUntil,
    } as never)
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return accessUntil;
}

