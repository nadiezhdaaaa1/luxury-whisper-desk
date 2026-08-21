// Mock event emitter for /dev/stripe.
//
// It POSTs to the webhook endpoint over HTTP — exactly the path real Stripe
// takes — instead of calling the provisioning helper. That indirection IS the
// seam; short-circuiting it would only test scaffolding.
//
// The shared secret never reaches the browser: the fetch happens here,
// server-side, and the page only sends the event body.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DevProfileState = {
  userId: string;
  email: string | null;
  plan: string | null;
  billing_period: string | null;
  trial_ends_at: string | null;
  quiz_completed: boolean | null;
};

function assertDevOnly() {
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("Not found");
  }
}

/** Server-side env gate for the page itself, plus the state it renders. */
export const devStripeState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevProfileState> => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan, billing_period, trial_ends_at, quiz_completed")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      email: data?.email ?? null,
      plan: data?.plan ?? null,
      billing_period: data?.billing_period ?? null,
      trial_ends_at: data?.trial_ends_at ?? null,
      quiz_completed: data?.quiz_completed ?? null,
    };
  });

type EmitInput = { id: string; type: string; data: Record<string, unknown> };

function parseEmit(input: unknown): EmitInput {
  const i = input as Partial<EmitInput> | null;
  if (!i || typeof i.id !== "string" || typeof i.type !== "string") {
    throw new Error("Invalid event");
  }
  return { id: i.id, type: i.type, data: (i.data as Record<string, unknown>) ?? {} };
}

export const emitStripeEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseEmit)
  .handler(async ({ data }) => {
    assertDevOnly();
    const origin = new URL(getRequest().url).origin;
    const res = await fetch(`${origin}/api/public/billing-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-billing-webhook-secret": process.env["STRIPE_WEBHOOK_SHARED_SECRET"] ?? "",
      },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  });
