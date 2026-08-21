// Server-side provisioning for the MOCK checkout only.
//
// This exists ONLY for the mock checkout. When Stripe lands, the webhook
// handler does this job keyed on the Stripe event, and this file must be
// deleted along with MOCK_CHECKOUT_ENABLED and the /checkout routes.
//
// Why it is server-side: public.enforce_plan_immutable() is a BEFORE UPDATE
// trigger on profiles that raises 42501 whenever plan or billing_period
// changes and the caller is not service_role / supabase_admin / postgres.
// That rule is correct — it is what will make the Stripe webhook the only
// thing able to grant paid access — so provisioning runs privileged here
// instead of from the browser. The trigger is not weakened in any way.
//
// Identity comes from the verified bearer token only: requireSupabaseAuth
// resolves the caller, and the privileged update is pinned to that caller's
// own id. No user id is ever read from the request body, so a caller can
// only provision themselves. Nothing here logs tokens or keys.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TRIAL_DAYS } from "@/lib/subscription";

type MockPlan = "trial" | "quarterly" | "annual";

function parsePlan(input: unknown): { plan: MockPlan } {
  const plan = (input as { plan?: unknown } | null)?.plan;
  if (plan !== "trial" && plan !== "quarterly" && plan !== "annual") {
    throw new Error("Invalid plan");
  }
  return { plan };
}

export const mockProvision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parsePlan)
  .handler(async ({ data, context }) => {
    // SECURITY: server functions are client-callable by design, so
    // requireSupabaseAuth alone means ANY signed-in user could call this and
    // grant themselves Pro annual. MOCK_CHECKOUT_ENABLED is a client-side
    // constant that gates the UI, not the endpoint — it is bundled into the
    // browser and is not a security boundary. Hard-close the door in production.
    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error("mock billing is disabled in production builds");
    }

    const { plan } = data;
    const userId = context.userId;


    // Privileged client — loaded inside the handler so the server-only module
    // never enters a client bundle. Required to satisfy enforce_plan_immutable.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch =
      plan === "trial"
        ? {
            plan: "pro",
            billing_period: "monthly",
            trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          }
        : {
            plan: "pro",
            billing_period: plan,
            trial_ends_at: null,
          };

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);

    // Same re-activation upgradeToPro performs: lifting the cap brings paused
    // watchlist rows back. Scoped to this caller only.
    const { error: wErr } = await supabaseAdmin
      .from("watchlist")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("is_active", false);
    if (wErr) throw new Error(wErr.message);

    return { ok: true as const, plan };
  });
