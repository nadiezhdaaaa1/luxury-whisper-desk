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
import { isDevBuild } from "@/lib/dev-only";

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
  // Fail-closed refusal first, and deliberately undescriptive: an
  // unauthenticated caller learns nothing about what lives here. Only a
  // development build serves this endpoint at all.
  if (!isDevBuild()) {
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
    // Only a completed checkout may bring an account into existence. Every other
    // event type for an unknown address is recorded and ignored — a failed
    // invoice must never conjure an account.
    const emailStr = typeof email === "string" ? email.trim() : "";
    if (event.type !== "checkout.session.completed" || emailStr.length === 0) {
      console.warn(
        `[billing-webhook] ${event.type} ${event.id}: no existing user for client_reference_id=${String(ref ?? "")} customer_email=${String(email ?? "")} — recorded, not provisioned`,
      );
      return json({ ok: true, event_id: event.id, user_found: false });
    }

    // Creation happens AFTER the idempotency insert above, so a redelivery of
    // the same event cannot create a second account.
    //
    // needs_credentials lives in app_metadata (service-role only). It cannot go
    // in user_metadata: the user can write that themselves, so the flag would be
    // forgeable. It is cleared server-side by the credential-setting functions.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailStr,
      email_confirm: true,
      app_metadata: { needs_credentials: true },
    });

    if (createErr) {
      // Race with a concurrent signup: the address now exists. Provision the
      // account that won rather than erroring.
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", emailStr)
        .maybeSingle();
      if (!existing?.id) {
        console.error(`[billing-webhook] ${event.id}: createUser failed — ${createErr.message}`);
        return json({ error: "could not create account" }, 500);
      }
      userId = existing.id;
    } else {
      userId = created.user?.id ?? null;
      if (!userId) return json({ error: "could not create account" }, 500);
    }
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
      // Also the recovery path out of dunning (clears past_due + access_until).
      const { clearTrial } = await import("@/lib/provisioning.server");
      await clearTrial(userId);
      return json({ ok: true, event_id: event.id, applied: "trial_cleared" });
    }

    case "invoice.payment_failed": {
      // past_due_since is stamped once per dunning cycle; retries must not move it.
      const { markPastDue } = await import("@/lib/provisioning.server");
      await markPastDue(userId);
      return json({ ok: true, event_id: event.id, applied: "past_due" });
    }

    case "customer.subscription.deleted": {
      // Access runs to the end of the paid period; plan stays 'pro'.
      const raw =
        event.data["current_period_end"] ??
        event.data["cancel_at"] ??
        event.data["ended_at"];
      let periodEnd: string | null = null;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        periodEnd = new Date(raw * 1000).toISOString();
      } else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) {
        periodEnd = new Date(raw).toISOString();
      }
      const { cancelSubscription } = await import("@/lib/provisioning.server");
      const accessUntil = await cancelSubscription(userId, periodEnd);
      return json({ ok: true, event_id: event.id, applied: "canceled", access_until: accessUntil });
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
