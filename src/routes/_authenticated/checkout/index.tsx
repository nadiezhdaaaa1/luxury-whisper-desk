// Mock checkout page — stands in for a hosted Stripe Checkout page.
// Deliberately collects NO card data: the payment method below is static text.
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { formatUsd } from "@/lib/billing-mock";
import { StaticPaymentMethod, TestModeBanner } from "@/components/checkout/MockCheckoutBits";
import {
  MOCK_CHECKOUT_ENABLED,
  checkoutCard,
  completeMockCheckout,
  parseCheckoutPlan,
} from "@/lib/checkout-mock";

const searchSchema = z.object({ plan: z.string().optional() }).partial();

export const Route = createFileRoute("/_authenticated/checkout/")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Checkout — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: rawPlan } = useSearch({ from: "/_authenticated/checkout/" });
  const plan = parseCheckoutPlan(rawPlan);
  const card = plan ? checkoutCard(plan) : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan && MOCK_CHECKOUT_ENABLED) track("checkout_started", { plan });
  }, [plan]);

  if (!MOCK_CHECKOUT_ENABLED || !plan || !card) {
    return (
      <div className="container-page py-20">
        <div className="card-soft mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-xl font-medium text-foreground">Not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This checkout link isn't valid. Pick a plan from the pricing section to continue.
          </p>
          <a href="/#pricing" className="btn-primary mt-6 inline-flex text-sm min-h-11">
            Back to pricing
          </a>
        </div>
      </div>
    );
  }

  const chargedToday =
    plan === "trial"
      ? "Nothing is charged today."
      : plan === "quarterly"
        ? `${formatUsd(67.47)} charged today`
        : `${formatUsd(173.88)} charged today`;

  async function onSubmit() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    track("checkout_submitted", { plan });
    try {
      await completeMockCheckout(plan);
      await navigate({ to: "/checkout/success", search: { plan } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg space-y-5">
        <TestModeBanner />

        <div className="card-soft p-8">
          <span className="eyebrow">Checkout</span>
          <h1 className="mt-3 font-display text-2xl font-medium text-foreground">{card.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{card.subtitle}</p>

          <div className="mt-6 space-y-2 border-t border-hairline pt-5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="text-foreground">
                {card.price} {card.unit}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Today</span>
              <span className="text-foreground">{chargedToday}</span>
            </div>
            {card.note ? <p className="text-muted-foreground">{card.note}</p> : null}
          </div>

          <div className="mt-5">
            <StaticPaymentMethod />
          </div>

          <p className="mt-5 text-xs text-muted-foreground">{card.fineprint}</p>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <button
            onClick={() => void onSubmit()}
            disabled={busy}
            className="btn-primary mt-6 w-full text-sm min-h-11 disabled:opacity-60"
          >
            {busy ? "Processing…" : card.cta}
          </button>

          <a
            href="/#pricing"
            className="btn-secondary mt-3 inline-flex w-full justify-center text-sm min-h-11"
          >
            Back to pricing
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Questions about renewal or refunds? See our{" "}
          <Link to="/billing" className="underline">
            billing terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
