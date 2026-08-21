// Billing webhook seam.
//
// This is the shape real Stripe will POST into. Today the only sender is the
// mock emitter at /dev/stripe, which goes over HTTP exactly like Stripe would,
// so the seam is exercised rather than simulated.
//
// Order of operations is load-bearing:
//   1. refuse unless allowed to run + authenticate the sender
//   2. dedupe by INSERT ... ON CONFLICT DO NOTHING (before any state write)
//   3. resolve the user (never create one — that is phase 3)
//   4. dispatch on type
//
// Non-2xx makes Stripe retry, so anything we understood-but-did-not-act-on
// still returns 200.
import { createFileRoute } from "@tanstack/react-router";
import { provisionPlan, parseProvisionPlan } from "@/lib/provisioning.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Step 1. This endpoint writes plan state with NO user session, so an open
 * version of it is a worse hole than the mockProvision one. Fail closed.
 *
 * When real Stripe lands, its signature verification replaces the body of this
 * function (same call site, same fail-closed contract): read the raw body,
 * recompute the HMAC over `t.<timestamp>.<payload>` with STRIPE_WEBHOOK_SECRET,
 * timing-safe compare against the `stripe-signature` header.
 */
function authorised(request: Request): boolean {
  const expected = process.env["STRIPE_WEBHOOK_SHARED_SECRET"] ?? "";
  if (expected.length === 0) return false;
  const given = request.headers.get("x-billing-webhook-secret") ?? "";
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

type Incoming = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

function parseEvent(body: unknown): Incoming | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b["id"] !== "string" || b["id"].length === 0) return null;
  if (typeof b["type"] !== "string" || b["type"].length === 0) return null;
  const data = b["data"];
  if (data !== undefined && (typeof data !== "object" || data === null)) return null;
  return {
    id: b["id"],
    type: b["type"],
    data: (data as Record<string, unknown>) ?? {},
  };
}

async function handle(request: Request): Promise<Response> {
  // Production refusal first, and deliberately undescriptive: an unauthenticated
  // caller learns nothing about what lives here.
  if ((process.env.NODE_ENV ?? "development") === "production") {
    return new Response("Not found", { status: 404 });
  }
  if (!authorised(request)) return json({ error: "unauthorised" }, 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const event = parseEvent(raw);
  if (!event) return json({ error: "invalid event shape" }, 400);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Step 2 — insert BEFORE acting, so two concurrent deliveries of the same
  // event id cannot both proceed. No row returned = already processed.
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("stripe_events")
    .upsert(
      { event_id: event.id, type: event.type, payload: event as never },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");
  if (insErr) return json({ error: insErr.message }, 500);
  if (!inserted || inserted.length === 0) {
    // 200 on a duplicate is deliberate: a non-2xx makes Stripe retry forever.
    return json({ ok: true, duplicate: true, event_id: event.id });
  }

  // Step 3 — resolve the user. client_reference_id (a user id) wins; customer_email
  // is the fallback.
  const ref = event.data["client_reference_id"];
  const email = event.data["customer_email"];
  let userId: string | null = null;

  if (typeof ref === "string" && ref.length > 0) {
    const { data } = await supabaseAdmin.from("profiles").select("id").eq("id", ref).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId && typeof email === "string" && email.length > 0) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    userId = data?.id ?? null;
  }

  if (!userId) {
    // PHASE 3: this is where a paid checkout for an unknown email creates the
    // account (supabaseAdmin.auth.admin.createUser) before provisioning it.
    // Phase 2 creates nobody.
    console.warn(
      `[billing-webhook] ${event.type} ${event.id}: no existing user for client_reference_id=${String(ref ?? "")} customer_email=${String(email ?? "")} — recorded, not provisioned`,
    );
    return json({ ok: true, event_id: event.id, user_found: false });
  }

  // Step 4 — dispatch.
  switch (event.type) {
    case "checkout.session.completed": {
      const paymentStatus = event.data["payment_status"];
      if (paymentStatus === "no_payment_required") {
        await provisionPlan(userId, "trial");
        return json({ ok: true, event_id: event.id, applied: "trial" });
      }
      if (paymentStatus === "paid") {
        const period =
          parseProvisionPlan(event.data["billing_period"]) ??
          parseProvisionPlan((event.data["metadata"] as Record<string, unknown> | undefined)?.["plan"]) ??
          parseProvisionPlan(event.data["plan"]);
        if (!period || period === "trial") {
          console.warn(
            `[billing-webhook] ${event.id}: paid session with no usable billing period — recorded only`,
          );
          return json({ ok: true, event_id: event.id, applied: null, reason: "no billing period" });
        }
        await provisionPlan(userId, period);
        return json({ ok: true, event_id: event.id, applied: period });
      }
      console.warn(`[billing-webhook] ${event.id}: unhandled payment_status ${String(paymentStatus)}`);
      return json({ ok: true, event_id: event.id, applied: null });
    }

    case "invoice.paid": {
      const { clearTrial } = await import("@/lib/provisioning.server");
      await clearTrial(userId);
      return json({ ok: true, event_id: event.id, applied: "trial_cleared" });
    }

    case "invoice.payment_failed": {
      // NOT IMPLEMENTED: there is no column to record past-due in. The event is
      // stored in stripe_events; nothing on the profile changes.
      // Needed schema (to be decided, not guessed): profiles.billing_status
      // ('active' | 'past_due' | 'canceled') + profiles.past_due_since timestamptz.
      console.warn(
        `[billing-webhook] ${event.id}: invoice.payment_failed for ${userId} — state write NOT IMPLEMENTED (no past-due column)`,
      );
      return json({ ok: true, event_id: event.id, applied: null, note: "past_due not persisted" });
    }

    case "customer.subscription.deleted": {
      // NOT IMPLEMENTED: nothing records "access ends at period end".
      // Needed schema: profiles.access_until timestamptz (and the billing_status
      // above set to 'canceled'); the access model would then read access_until
      // instead of assuming plan='pro' means live.
      console.warn(
        `[billing-webhook] ${event.id}: customer.subscription.deleted for ${userId} — state write NOT IMPLEMENTED (no access_until column)`,
      );
      return json({ ok: true, event_id: event.id, applied: null, note: "cancellation not persisted" });
    }

    default:
      // Recorded in step 2. Never 500 on an event we do not handle.
      console.info(`[billing-webhook] ${event.id}: unhandled type ${event.type} — recorded only`);
      return json({ ok: true, event_id: event.id, applied: null, unhandled: true });
  }
}

export const Route = createFileRoute("/api/public/billing-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
    },
  },
});
