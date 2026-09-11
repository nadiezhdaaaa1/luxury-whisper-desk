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
import { accessQueryOptions } from "@/lib/access";
import { TestModeBanner } from "@/components/checkout/MockCheckoutBits";
import thanksCheck from "@/assets/thanks-check.webp";

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

/**
 * One-shot confetti bound to our own canvas (never the global one), fired
 * 120ms after the thank-you content first paints. It celebrates the PAYMENT,
 * which already happened before the browser got here, so it is correct in
 * every access state.
 */
function useConfettiOnce(canvasRef: React.RefObject<HTMLCanvasElement | null>, ready: boolean) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!ready || firedRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    firedRef.current = true;

    let cancelled = false;
    const t = setTimeout(() => {
      void import("canvas-confetti").then(({ default: confetti }) => {
        if (cancelled) return;
        const fire = confetti.create(canvas, { resize: true, useWorker: true });
        void fire({
          particleCount: 70,
          spread: 70,
          startVelocity: 34,
          gravity: 0.9,
          ticks: 90,
          scalar: 0.9,
          origin: { x: 0.5, y: 0.55 },
          colors: ["#2225ca", "#dc604a", "#00958f", "#d5a13c"],
          disableForReducedMotion: true,
        });
      });
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, canvasRef]);
}

function ThankYouPage() {
  const { plan: rawPlan } = Route.useSearch();
  const plan = rawPlan;

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useConfettiOnce(canvasRef, !authLoading);

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

  const notOnboarded = access.data?.onboarded === false;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-hero-tray px-4 py-16">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      <div className="relative z-10 w-full max-w-[520px]">
        <div className="flex flex-col items-center gap-[32px]">
          <TestModeBanner />

          <div className="flex w-full flex-col items-center gap-[12px] px-4 text-center">
            <h1 className="text-[48px] leading-[1.3] tracking-[-1.45px] text-foreground">
              <span className="font-display font-semibold">Thank you.</span>
            </h1>
            <p className="text-[18px] leading-[1.6] text-foreground">
              Your payment went through. Here's what happens next.
            </p>

          </div>

          {authLoading ? (
            // Neutral placeholder: until the session resolves we do not know
            // whether "setting up your access" or "sign in" applies, and a
            // payment page must not visibly flip between the two.
            <p className="text-sm text-muted-foreground">Checking your account…</p>
          ) : !signedIn ? (
            <div className="flex w-full flex-col items-center gap-[24px] px-4 text-center">
              <p className="max-w-[488px] text-[16px] leading-[1.6] text-foreground">

                Your receipt is on its way by email. Sign in to see your access and start following
                your brands.
              </p>
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="btn-primary h-[56px] w-full max-w-[240px] rounded-full text-sm"
              >
                Sign in
              </Link>
            </div>
          ) : confirmed ? (
            <>
              <div className="flex w-full flex-wrap items-center gap-[32px] rounded-[20px] border border-white bg-white/80 py-[9px] pl-[29px] pr-[17px] shadow-soft">
                <p
                  className="flex-1 font-display text-foreground"
                  style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 600 }}
                >
                  Every brand you follow is watched for{" "}
                  <span className="font-semibold">discounts, drops and price rises</span>.
                </p>
                <img
                  src={thanksCheck}
                  alt=""
                  aria-hidden
                  className="h-20 w-20 shrink-0 object-contain"
                />
              </div>

              <p
                className="max-w-[488px] px-4 text-center text-foreground"
                style={{ fontSize: 16, lineHeight: 1.6 }}
              >
                One last thing: choose the brands you want to follow. From there we watch the market
                for you, and the moment something moves on one of them, it lands in your alerts.
              </p>

              <p
                className="max-w-[420px] text-center italic text-muted-foreground"
                style={{ fontSize: 14, lineHeight: 1.2 }}
              >
                The next price move on your brands won't slip past you.
              </p>

              <div className="flex w-full flex-col items-center gap-3">
                <Link
                  to={notOnboarded ? "/app/quiz" : "/app/signals"}
                  className="btn-primary h-[56px] w-full max-w-[240px] rounded-full text-sm"
                >
                  {notOnboarded ? "Choose your brands" : "Go to price alerts"}
                </Link>
                <Link to="/app/settings" className="btn-tertiary text-sm">
                  View subscription
                </Link>
              </div>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-[24px] px-4 text-center">
              <p
                className="max-w-[488px] text-foreground"
                style={{ fontSize: 16, lineHeight: 1.6 }}
              >
                {gaveUp
                  ? "This is taking longer than expected. Your payment is not lost. Check your subscription in a few minutes, and get in touch if it still looks wrong."
                  : "We're setting up your access. One moment while we confirm this with our payment provider."}
              </p>
              <div className="flex w-full flex-col items-center gap-3">
                <Link
                  to="/app/settings"
                  className="btn-primary h-[56px] w-full max-w-[240px] rounded-full text-sm"
                >
                  View subscription
                </Link>
                {gaveUp ? (
                  <Link
                    to="/contact"
                    search={{ topic: undefined }}
                    className="btn-tertiary text-sm"
                  >
                    Contact us
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
