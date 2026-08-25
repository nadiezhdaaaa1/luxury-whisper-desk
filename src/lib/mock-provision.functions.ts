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
    // browser and is not a security boundary. Fail closed: the door only opens
    // in a development build.
    assertDevOnly();


    const { plan } = data;
    const userId = context.userId;

    // Single source of the plan write, shared with the billing webhook. Loaded
    // inside the handler so the server-only module never enters a client bundle.
    // It writes through supabaseAdmin, which is what satisfies enforce_plan_immutable.
    const { provisionPlan } = await import("@/lib/provisioning.server");
    await provisionPlan(userId, plan);


    return { ok: true as const, plan };
  });
