// Anonymous (pay-before-account) mock checkout.
//
// The anonymous door emits the same webhook event Stripe would send, over HTTP,
// with `customer_email` instead of `client_reference_id`. The webhook is the
// only thing that creates the account and grants the plan. The shared secret
// never reaches the browser: the fetch happens here, server-side.
//
// Both functions are dev-only. They are unauthenticated by necessity (there is
// no session yet), which is precisely why they must be closed in production.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isDevBuild } from "@/lib/dev-only";

export type AnonPlan = "monthly" | "quarterly" | "annual";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertDevOnly() {
  // Fail-closed: only a development build passes; anything else refuses.
  if (!isDevBuild()) {
    throw new Error("mock billing is disabled in production builds");
  }
}


function parseStart(input: unknown): { plan: AnonPlan; email: string } {
  const i = (input ?? {}) as { plan?: unknown; email?: unknown };
  if (i.plan !== "monthly" && i.plan !== "quarterly" && i.plan !== "annual") {
    throw new Error("Invalid plan");
  }
  const email = typeof i.email === "string" ? i.email.trim().toLowerCase() : "";
  // Validated client-side too; re-validated here because the client copy is not
  // a boundary.
  if (!EMAIL_RE.test(email) || email.length > 254) throw new Error("Enter a valid email address");
  return { plan: i.plan, email };
}

/** Emits checkout.session.completed for an address with no account yet. */
export const startAnonCheckout = createServerFn({ method: "POST" })
  .inputValidator(parseStart)
  .handler(async ({ data }) => {
    assertDevOnly();
    const eventId = `evt_mock_${crypto.randomUUID()}`;
    const { selfOrigin } = await import("@/lib/webhook-origin.server");
    const origin = selfOrigin(getRequest().url);

    const body = {
      id: eventId,
      type: "checkout.session.completed",
      data: {
        customer_email: data.email,
        payment_status: data.plan === "monthly" ? "trialing" : "paid",
        billing_period: data.plan,
      },
    };
    let res: Response;
    try {
      res = await fetch(`${origin}/api/public/billing-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-billing-webhook-secret": process.env["STRIPE_WEBHOOK_SHARED_SECRET"] ?? "",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      // Never let a transport failure bubble up as "fetch failed" / blank screen.
      console.error("[anon-checkout] webhook POST failed", origin, e);
      throw new Error("Checkout could not be completed. Please try again.");
    }
    if (!res.ok) throw new Error("Checkout could not be completed. Please try again.");

    return { eventId };
  });

export type MintResult = { email: string; tokenHash: string };

/**
 * Single-use session mint for /checkout/return.
 *
 * The claim on `session_minted_at` is a conditional UPDATE, not a read-then-
 * write: an event id is otherwise a repeatable "sign me in as that user"
 * primitive, i.e. account takeover.
 */
export const mintCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const id = (input as { eventId?: unknown } | null)?.eventId;
    if (typeof id !== "string" || id.length === 0) throw new Error("Missing event id");
    return { eventId: id };
  })
  .handler(async ({ data }): Promise<MintResult> => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("stripe_events")
      .select("event_id, type, payload, session_minted_at")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.type !== "checkout.session.completed") {
      throw new Error("This link is not valid.");
    }

    const payload = (row.payload ?? {}) as { data?: Record<string, unknown> };
    const email = String(payload.data?.["customer_email"] ?? "").trim().toLowerCase();
    const ref = payload.data?.["client_reference_id"];

    // Resolve the account the event provisioned, and require that it IS
    // provisioned — an event that never reached provisioning mints nothing.
    const q = supabaseAdmin.from("profiles").select("id, email, plan");
    const { data: profile } = await (typeof ref === "string" && ref.length > 0
      ? q.eq("id", ref)
      : q.eq("email", email)
    ).maybeSingle();
    if (!profile?.id || profile.plan !== "pro") throw new Error("This link is not valid.");

    // Atomic claim. No row back = already used.
    const { data: claimed, error: cErr } = await supabaseAdmin
      .from("stripe_events")
      .update({ session_minted_at: new Date().toISOString() } as never)
      .eq("event_id", data.eventId)
      .is("session_minted_at", null)
      .select("event_id");
    if (cErr) throw new Error(cErr.message);
    if (!claimed || claimed.length === 0) {
      throw new Error("This link has already been used. Sign in to continue.");
    }

    const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (lErr) throw new Error(lErr.message);
    const tokenHash = link.properties?.hashed_token ?? "";
    if (!tokenHash) throw new Error("Could not start your session.");

    return { email: profile.email, tokenHash };
  });
