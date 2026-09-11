// Post-payment thank-you page. PUBLIC on purpose: a browser returning from
// stripe.com may carry no session, and the auth gate would bounce it to login.
//
// CORRECTNESS RULE: the thank-you may be shown immediately, because by the time
// Stripe redirects here the payment has already happened on Stripe's side. But
// ACCESS is NEVER derived from the URL. `session_id` is attacker-controllable —
// anyone can type `?session_id=whatever` — so entitlement state comes only from
// the server via `accessQueryOptions()`. We accept `session_id` so the param is
// already wired when real Stripe lands, never log it, and verify nothing against
// it today (there is nothing to verify against while billing is mocked).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import { checkoutCard, parseCheckoutPlan } from "@/lib/checkout-mock";
import { accessQueryOptions } from "@/lib/access";
import { TestModeBanner } from "@/components/checkout/MockCheckoutBits";

const searchSchema = z
  .object({ session_id: z.string().optional(), plan: z.string().optional() })
  .partial();

/** Poll every 3s, at most 10 times (~30s), then stop and say so. */
const POLL_MS = 3000;
const MAX_ATTEMPTS = 10;

export const Route = createFileRoute("/thank-you")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Thank you — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { plan: rawPlan } = Route.useSearch();
  const plan = parseCheckoutPlan(rawPlan);
  const card = plan ? checkoutCard(plan) : undefined;

  const { user, loading: authLoading } = useAuth();
  const signedIn = !!user;

  const queryClient = useQueryClient();
  // Never call the access server fn while signed out: its auth middleware
  // throws without a bearer token.
  const access = useQuery({ ...accessQueryOptions(), enabled: signedIn });
  const [attempts, setAttempts] = useState(0);
  const gaveUp = attempts >= MAX_ATTEMPTS;
  const confirmed = signedIn && access.data?.subscription === true;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (plan && confirmed && !trackedRef.current) {
      trackedRef.current = true;
      track("checkout_succeeded", { plan });
    }
  }, [plan, confirmed]);

  useEffect(() => {
    if (!signedIn || confirmed || gaveUp) return;
    const t = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["access"] });
      setAttempts((a) => a + 1);
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [signedIn, confirmed, gaveUp, attempts, queryClient]);

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg space-y-5">
        <TestModeBanner />

        <div className="card-soft p-8">
          <span className="eyebrow">Thank you</span>
          <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
            Thank you for your payment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your payment went through. Here's what happens next.
          </p>

          <div className="mt-6 border-t border-hairline pt-5">
            {!signedIn && !authLoading ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your receipt is on its way by email. Sign in to see your access and start
                  following your brands.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    to="/login"
                    search={{ redirect: undefined }}
                    className="btn-primary text-sm min-h-11"
                  >
                    Sign in
                  </Link>
                </div>
              </>
            ) : confirmed ? (
              <>
                {card ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {`Your access is active. You're on ${card.name} — ${card.price} ${card.unit}. Everything is unlocked right away.`}
                    </p>
                    {card.renewal ? (
                      <p className="mt-1 text-sm text-muted-foreground">{card.renewal}</p>
                    ) : null}
                    <p className="mt-4 text-sm text-foreground">{card.disclosure}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your access is active. We couldn't tell which plan this was for — check your
                    subscription in settings.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link to="/app/signals" className="btn-primary text-sm min-h-11">
                    Go to price alerts
                  </Link>
                  <Link to="/app/settings" className="btn-secondary text-sm min-h-11">
                    View subscription
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {gaveUp
                    ? "This is taking longer than expected. Your payment is not lost — check your subscription in a few minutes, and get in touch if it still looks wrong."
                    : "We're setting up your access — one moment while we confirm this with our payment provider."}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link to="/app/settings" className="btn-primary text-sm min-h-11">
                    View subscription
                  </Link>
                  {gaveUp ? (
                    <Link
                      to="/contact"
                      search={{ topic: undefined }}
                      className="btn-secondary text-sm min-h-11"
                    >
                      Contact us
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
