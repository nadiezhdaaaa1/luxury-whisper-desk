// Mock Stripe emitter. Dev-only: both this page's data source and the webhook
// it posts to refuse to run in production.
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { devStripeState, emitStripeEvent } from "@/lib/dev-stripe.functions";

const searchSchema = z.object({ plan: z.string().optional() }).partial();

export const Route = createFileRoute("/_authenticated/dev/stripe")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Mock Stripe events" }, { name: "robots", content: "noindex" }],
  }),
  component: DevStripePage,
});

type EventBody = { id: string; type: string; data: Record<string, unknown> };

function newId(prefix: string) {
  return `evt_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function DevStripePage() {
  const { plan: rawPlan } = useSearch({ from: "/_authenticated/dev/stripe" });
  const plan = rawPlan === "trial" || rawPlan === "quarterly" || rawPlan === "annual" ? rawPlan : "trial";

  const emit = useServerFn(emitStripeEvent);
  const state = useQuery({ queryKey: ["dev-stripe-state"], queryFn: () => devStripeState() });
  const [log, setLog] = useState<string[]>([]);
  const lastEvent = useRef<EventBody | null>(null);

  const send = useCallback(
    async (body: EventBody) => {
      lastEvent.current = body;
      try {
        const res = await emit({ data: body });
        setLog((l) => [`${body.type} (${body.id}) → ${res.status} ${res.body}`, ...l].slice(0, 12));
      } catch (e) {
        setLog((l) => [`${body.type} → error: ${e instanceof Error ? e.message : "failed"}`, ...l]);
      }
      await state.refetch();
    },
    [emit, state],
  );

  const userId = state.data?.userId ?? "";
  const base = (extra: Record<string, unknown> = {}) => ({
    client_reference_id: userId,
    customer_email: state.data?.email ?? undefined,
    ...extra,
  });

  const buttons: { label: string; make: () => EventBody }[] = [
    {
      label: "checkout.session.completed — trial (no_payment_required)",
      make: () => ({
        id: newId("trial"),
        type: "checkout.session.completed",
        data: base({ payment_status: "no_payment_required", billing_period: "monthly" }),
      }),
    },
    {
      label: `checkout.session.completed — paid (${plan === "trial" ? "quarterly" : plan})`,
      make: () => ({
        id: newId("paid"),
        type: "checkout.session.completed",
        data: base({
          payment_status: "paid",
          billing_period: plan === "trial" ? "quarterly" : plan,
        }),
      }),
    },
    {
      label: "invoice.paid — clear trial",
      make: () => ({ id: newId("invpaid"), type: "invoice.paid", data: base() }),
    },
    {
      label: "invoice.payment_failed",
      make: () => ({ id: newId("invfail"), type: "invoice.payment_failed", data: base() }),
    },
    {
      label: "customer.subscription.deleted",
      make: () => ({ id: newId("subdel"), type: "customer.subscription.deleted", data: base() }),
    },
  ];

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-hairline bg-surface p-4 text-sm">
          <span className="eyebrow">Dev only</span>
          <h1 className="mt-2 font-display text-xl font-medium text-foreground">
            Mock Stripe events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Invoked with plan <code>{plan}</code> · user <code>{userId || "…"}</code>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Every button POSTs a real HTTP event to the webhook endpoint, with the shared secret
            attached server-side.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {buttons.map((b) => (
            <button
              key={b.label}
              className="btn-secondary text-sm min-h-11 justify-start"
              onClick={() => void send(b.make())}
            >
              {b.label}
            </button>
          ))}

          <button
            className="btn-secondary text-sm min-h-11 justify-start"
            disabled={!lastEvent.current}
            onClick={() => {
              // Same event id on purpose — the second delivery must change nothing.
              if (lastEvent.current) void send(lastEvent.current);
            }}
          >
            Resend last event (same id — idempotency check)
          </button>

          {/* No event exists for abandonment; Stripe sends nothing. This is how
              "chose annual, didn't pay" stays reachable. */}
          <Link
            to="/checkout"
            search={{ plan }}
            className="btn-tertiary text-sm min-h-11 justify-start"
          >
            Abandoned — emit nothing, go to the cancel path
          </Link>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-4 text-sm">
          <h2 className="font-display font-medium text-foreground">Current profile</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <dt>plan</dt>
            <dd className="text-foreground">{String(state.data?.plan ?? "…")}</dd>
            <dt>billing_period</dt>
            <dd className="text-foreground">{String(state.data?.billing_period ?? "null")}</dd>
            <dt>trial_ends_at</dt>
            <dd className="text-foreground">{String(state.data?.trial_ends_at ?? "null")}</dd>
            <dt>quiz_completed</dt>
            <dd className="text-foreground">{String(state.data?.quiz_completed ?? "…")}</dd>
          </dl>
        </div>

        {log.length > 0 ? (
          <pre className="overflow-x-auto rounded-xl border border-hairline bg-surface p-4 text-xs text-muted-foreground">
            {log.join("\n")}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
