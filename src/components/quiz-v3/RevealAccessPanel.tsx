// The reveal's right-hand column for an ALREADY AUTHENTICATED visitor
// (`/app/quiz`). It never attempts account creation — it only reads the
// server-computed access flags and shows the matching next step.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { accessQueryOptions } from "@/lib/access";
import { PAYWALL_CARDS } from "@/lib/subscription";
import { CredentialControls } from "@/components/auth/CredentialControls";
import { LockedPlanCard, lockedPlanId } from "@/components/quiz-v3/LockedPlanCard";
import { usePlanFlow } from "@/lib/onboarding/usePlanFlow";
import { commitPendingQuizDraft } from "@/lib/onboarding/commitOnboarding";

export function RevealAccessPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: access, isLoading } = useQuery(accessQueryOptions());
  // Signed in already, so this never opens the registration modal — it just
  // routes the plan decision through the one shared branch.
  const flow = usePlanFlow({ source: "aha_in_app" });

  async function finish() {
    // Idempotent: on this surface the answers are normally already stored, so
    // this is a no-op. A failure here must never block the dashboard.
    try {
      await commitPendingQuizDraft({ alreadyOnboarded: access?.onboarded === true });
    } catch (e) {
      console.error("[onboarding] in-app commit skipped:", e);
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["access"] });
    await navigate({ to: "/app", replace: true });
  }

  if (isLoading || !access) {
    return <Shell heading="Loading your plan…">{null}</Shell>;
  }

  // Signed in, nothing bought yet → send them to checkout.
  if (!access.subscription) {
    return (
      <Shell heading="Pick how you pay">
        <div className="space-y-2">
          {PAYWALL_CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void flow.selectPlan({ plan: c.id })}
              className={c.id === "annual" ? "btn-primary w-full" : "btn-secondary w-full"}
            >
              {c.cta}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Your answers are saved — you can come back to this.
        </p>
      </Shell>
    );
  }

  const planId = lockedPlanId(access.period);

  // Paid, but the account still has no way to sign back in.
  if (!access.credentials) {
    return (
      <>
        <LockedPlanCard planId={planId} />
        <div className="mt-8">
        <Shell heading="Last step — secure your account">
          <CredentialControls
            redirectTo={
              typeof window === "undefined" ? "/app/quiz" : window.location.origin + "/app/quiz"
            }
            onDone={finish}
            submitLabel="Set password and continue"
          />
        </Shell>
        </div>
      </>
    );
  }

  return (
    <>
      <LockedPlanCard planId={planId} />
      <div className="mt-8">
      <Shell heading="You're all set">
      <button type="button" onClick={() => void finish()} className="btn-primary w-full mt-6">
        Continue to your dashboard
      </button>
      </Shell>
      </div>
    </>
  );
}

function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div
      className="card-soft p-6 sm:p-8 shadow-none"
    >
      <div className="font-display text-base font-medium">{heading}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
