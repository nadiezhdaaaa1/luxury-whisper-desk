// Mock checkout return page — mirrors Stripe's success_url shape.
//
// It must NOT assert success: the browser can return before the webhook has
// landed. Three states — pending (polling), confirmed, and a bounded give-up.
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { checkoutCard, parseCheckoutPlan } from "@/lib/checkout-mock";
import { accessQueryOptions } from "@/lib/access";
import { TestModeBanner } from "@/components/checkout/MockCheckoutBits";

const searchSchema = z.object({ plan: z.string().optional() }).partial();

/** Poll every 3s, at most 10 times (~30s), then stop and say so. */
const POLL_MS = 3000;
const MAX_ATTEMPTS = 10;

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

  const queryClient = useQueryClient();
  const access = useQuery(accessQueryOptions());
  const [attempts, setAttempts] = useState(0);
  const gaveUp = attempts >= MAX_ATTEMPTS;
  const confirmed = access.data?.subscription === true;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (plan && confirmed && !trackedRef.current) {
      trackedRef.current = true;
      track("checkout_succeeded", { plan });
    }
  }, [plan, confirmed]);

  useEffect(() => {
    if (confirmed || gaveUp) return;
    const t = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["access"] });
      setAttempts((a) => a + 1);
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [confirmed, gaveUp, attempts, queryClient]);

  if (!confirmed) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg space-y-5">
          <TestModeBanner />
          <div className="card-soft p-8">
            <span className="eyebrow">{gaveUp ? "Still working on it" : "Confirming"}</span>
            <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
              {gaveUp ? "This is taking longer than expected" : "Confirming your payment"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {gaveUp
                ? "Your payment may still be going through. Nothing is lost — check your subscription in a few minutes, and get in touch if it still looks wrong."
                : "One moment while we confirm this with our payment provider."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/settings" className="btn-primary text-sm min-h-11">
                View subscription
              </Link>
              {gaveUp ? (
                <Link to="/contact" search={{ topic: undefined }} className="btn-secondary text-sm min-h-11">
                  Contact us
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg space-y-5">
        <TestModeBanner />

        <div className="card-soft p-8">
          <span className="eyebrow">Confirmed</span>
          <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
            {"Your access is active"}
          </h1>

          {card ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {`You're on ${card.name} — ${card.price} ${card.unit}. Everything is unlocked right away.`}
              </p>
              {card.renewal ? (
                <p className="mt-1 text-sm text-muted-foreground">{card.renewal}</p>
              ) : null}
              <p className="mt-4 text-sm text-foreground">{card.disclosure}</p>
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
