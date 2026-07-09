import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fetchMyProfile } from "@/lib/profile";
import { track } from "@/lib/analytics";
import {
  PLAN_DEFS,
  planLabel,
  upgradeToPro,
  type PlanDef,
} from "@/lib/subscription";

export const Route = createFileRoute("/_authenticated/app/upgrade")({
  component: UpgradePage,
});

function UpgradePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const [pending, setPending] = useState<PlanDef["id"] | null>(null);

  useEffect(() => {
    track("upgrade_viewed", {});
  }, []);

  const currentPlan = profileQ.data?.plan ?? "free";
  const currentPeriod = profileQ.data?.billing_period ?? null;

  async function handleSelect(def: PlanDef) {
    track("plan_selected", { plan: def.plan, period: def.billing_period });
    if (def.plan === "free") {
      // Direct-flip UX only exposes upgrade to Pro here; Free selection is a no-op
      // that routes the user back to Settings for the downgrade control.
      navigate({ to: "/app/settings" });
      return;
    }
    if (def.billing_period == null) return;
    setPending(def.id);
    try {
      await upgradeToPro(def.billing_period);
      track("upgraded_to_pro", { period: def.billing_period });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me"] }),
        qc.invalidateQueries({ queryKey: ["watchlist"] }),
        qc.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
      toast.success("You're on Pro", {
        description: "Checkout will be wired to Stripe soon — Pro is unlocked for you now.",
      });
      navigate({ to: "/app/settings" });
    } catch (e) {
      console.error("[upgrade] failed", e);
      toast.error("Couldn't switch plan", { description: "Please try again." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/app/settings" })}
        className="inline-flex items-center gap-1.5 text-xs font-display font-medium text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
      </button>

      <div className="max-w-2xl">
        <span className="eyebrow">Upgrade</span>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] text-foreground">
          Unlock the full Price.you command center.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Start free. Upgrade when your collection grows.
          {profileQ.isLoading ? null : (
            <>
              {" "}
              You're currently on{" "}
              <span className="font-display font-semibold text-foreground">
                {planLabel(currentPlan, currentPeriod)}
              </span>
              .
            </>
          )}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-champagne-soft/50 px-4 py-3 flex items-start gap-2.5 text-sm max-w-3xl">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="text-muted-foreground">
          <span className="font-display font-semibold text-foreground">Checkout is coming soon.</span>{" "}
          To keep validating the product, choosing Pro here unlocks it for your account
          immediately — no card required. Real billing will replace this in a later release.
        </div>
      </div>

      {profileQ.isLoading ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PLAN_DEFS.map((p) => {
            const isCurrent =
              p.plan === currentPlan &&
              (p.plan === "free" || p.billing_period === currentPeriod);
            const isPending = pending === p.id;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border border-hairline bg-surface p-7 flex flex-col relative shadow-soft ${
                  p.featured ? "ring-2 ring-positive" : ""
                }`}
              >
                {p.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-primary text-primary-foreground shadow-soft">
                    {p.badge}
                  </span>
                ) : null}

                <h3 className="font-display font-semibold text-xl">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display font-bold text-4xl tracking-tight">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.unit}</span>
                </div>
                {p.note ? (
                  <p className="mt-1 text-xs text-positive font-display font-semibold">{p.note}</p>
                ) : null}

                <ul className="mt-6 space-y-3 flex-1">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-positive mt-0.5 shrink-0" />
                      <span className="text-foreground/90">{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {isCurrent ? (
                    <div className="w-full rounded-full border border-hairline bg-surface-2 text-center py-2.5 text-sm font-display font-semibold text-muted-foreground">
                      Current plan
                    </div>
                  ) : p.plan === "free" ? (
                    <Button
                      variant="ghost"
                      className="w-full rounded-full"
                      onClick={() => handleSelect(p)}
                    >
                      Manage in settings
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelect(p)}
                      disabled={pending !== null}
                      className={`w-full rounded-full ${
                        p.featured
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-foreground text-background hover:bg-foreground/90"
                      }`}
                    >
                      {isPending ? "Unlocking…" : currentPlan === "pro" ? "Switch to this plan" : "Choose this plan"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Values and signals are estimates, not investment advice.
      </p>
    </div>
  );
}
