// Mock checkout page — stands in for a hosted Stripe Checkout page.
// Deliberately collects NO card data: the payment method below is static text.
//
// Public on purpose: pay-first visitors reach it with no account. Signed in it
// behaves exactly as before (no email field, client_reference_id = user id);
// anonymous it collects the one thing Stripe Checkout would collect, an email.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { formatUsd } from "@/lib/billing-mock";
import { chargedTodayUsd } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { StaticPaymentMethod, TestModeBanner } from "@/components/checkout/MockCheckoutBits";
import { startAnonCheckout } from "@/lib/checkout-anon.functions";
import {
  MOCK_CHECKOUT_ENABLED,
  checkoutCard,
  completeMockCheckout,
  parseCheckoutPlan,
} from "@/lib/checkout-mock";

const searchSchema = z.object({ plan: z.string().optional() }).partial();
const emailSchema = z.string().trim().email();

export const Route = createFileRoute("/checkout/")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Checkout — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: rawPlan } = Route.useSearch();
  const plan = parseCheckoutPlan(rawPlan);
  const card = plan ? checkoutCard(plan) : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

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

  const chargedAmount = chargedTodayUsd(plan);
  const chargedToday =
    chargedAmount === null
      ? "Nothing is charged today."
      : `${formatUsd(chargedAmount)} charged today`;

  async function onSubmit() {
    if (!plan) return;
    setError(null);
    if (signedIn === false) {
      // Anonymous: validated here and again server-side.
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        setError("Enter a valid email address.");
        return;
      }
      setBusy(true);
      track("checkout_submitted", { plan });
      try {
        const { eventId } = await startAnonCheckout({ data: { plan, email: parsed.data } });
        await navigate({ to: "/checkout/return", search: { event_id: eventId, plan } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        setBusy(false);
      }
      return;
    }
    setBusy(true);
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
            {card.renewal ? <p className="text-muted-foreground">{card.renewal}</p> : null}
          </div>

          {signedIn === false ? (
            <div className="mt-5">
              <label
                htmlFor="checkout-email"
                className="block text-xs uppercase tracking-wide text-muted-foreground"
              >
                Email
              </label>
              <input
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-hairline bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Your receipt and account go to this address. You'll choose how to sign in right
                after.
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <StaticPaymentMethod />
          </div>

          <p className="mt-5 text-xs text-muted-foreground">{card.disclosure}</p>

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
