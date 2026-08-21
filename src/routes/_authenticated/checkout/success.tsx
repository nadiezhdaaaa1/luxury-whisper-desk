// Mock checkout return page — mirrors Stripe's success_url shape.
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { checkoutCard, parseCheckoutPlan } from "@/lib/checkout-mock";
import { TRIAL_DAYS } from "@/lib/subscription";
import { TestModeBanner } from "@/components/checkout/MockCheckoutBits";

const searchSchema = z.object({ plan: z.string().optional() }).partial();

export const Route = createFileRoute("/_authenticated/checkout/success")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "You're all set — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { plan: rawPlan } = useSearch({ from: "/_authenticated/checkout/success" });
  const plan = parseCheckoutPlan(rawPlan);
  const card = plan ? checkoutCard(plan) : undefined;

  useEffect(() => {
    if (plan) track("checkout_succeeded", { plan });
  }, [plan]);

  const firstCharge = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg space-y-5">
        <TestModeBanner />

        <div className="card-soft p-8">
          <span className="eyebrow">Confirmed</span>
          <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
            {plan === "trial" ? `Your ${TRIAL_DAYS} days have started` : "Your access is active"}
          </h1>

          {card ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan === "trial"
                  ? `You're on ${card.name} — full access, nothing charged today. Your first charge falls on ${firstCharge}.`
                  : `You're on ${card.name} — ${card.price} ${card.unit}. Everything is unlocked right away.`}
              </p>
              {card.note ? (
                <p className="mt-1 text-sm text-muted-foreground">{card.note}</p>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">{card.fineprint}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't tell which plan this was for. Check your subscription in settings.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/app/portfolio" className="btn-primary text-sm min-h-11">
              Go to your portfolio
            </Link>
            <Link to="/app/settings" className="btn-secondary text-sm min-h-11">
              View subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
