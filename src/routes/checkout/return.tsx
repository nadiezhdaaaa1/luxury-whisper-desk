// Session mint for the anonymous checkout door.
//
// Stripe would send the browser back here after payment. The event id is the
// only thing the browser carries, and it is single-use: mintCheckoutSession
// claims `session_minted_at` with a conditional update, so a replayed link
// signs nobody in.
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { mintCheckoutSession } from "@/lib/checkout-anon.functions";
import { TestModeBanner } from "@/components/checkout/MockCheckoutBits";

const searchSchema = z
  .object({ event_id: z.string().optional(), plan: z.string().optional() })
  .partial();

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Finishing up — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const navigate = useNavigate();
  const { event_id: eventId } = useSearch({ from: "/checkout/return" });
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      if (!eventId) {
        setError("This link is not valid.");
        return;
      }
      try {
        const { tokenHash } = await mintCheckoutSession({ data: { eventId } });
        // token_hash form: pass only the hash and type, never an email alongside.
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (vErr) throw new Error(vErr.message);
        await navigate({ to: "/app", replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start your session.");
      }
    })();
  }, [eventId, navigate]);

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg space-y-5">
        <TestModeBanner />
        <div className="card-soft p-8">
          <span className="eyebrow">{error ? "Can't continue" : "One moment"}</span>
          <h1 className="mt-3 font-display text-2xl font-medium text-foreground">
            {error ? "This link can't be used" : "Setting up your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "We're signing you in — this takes a second."}
          </p>
          {error ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/login" search={{ redirect: undefined }} className="btn-primary text-sm min-h-11">
                Sign in
              </Link>
              <Link to="/contact" search={{ topic: undefined }} className="btn-secondary text-sm min-h-11">
                Contact us
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
