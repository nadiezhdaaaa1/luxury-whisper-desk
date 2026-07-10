import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile";
import { TwoFactorEnroll } from "@/components/auth/TwoFactorEnroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  downgradeToFree,
  planLabel,
  PLAN_DEFS,
  upgradeToPro,
  type PlanDef,
} from "@/lib/subscription";
import { fetchPortfolio, FREE_PORTFOLIO_CAP } from "@/lib/portfolio";
import { fetchWatchlist, FREE_ACTIVE_CAP } from "@/lib/watchlist";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMyProfile,
  });
  const { data: portfolio = [] } = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });
  const { data: watchlist = [] } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });

  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [pending, setPending] = useState<PlanDef["id"] | null>(null);

  async function handleLogout() {
    track("log_out", {});
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  async function handleDowngrade() {
    setDowngrading(true);
    try {
      await downgradeToFree();
      track("downgraded_to_free", {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
      toast.success("You're on Free", {
        description: "Nothing was deleted. Extra watchlist items are paused and over-cap portfolio items are read-only.",
      });
    } catch (e) {
      console.error("[downgrade] failed", e);
      toast.error("Couldn't switch plan", { description: "Please try again." });
    } finally {
      setDowngrading(false);
      setConfirmDowngrade(false);
    }
  }

  async function handleSelectPlan(def: PlanDef) {
    track("plan_selected", { plan: def.plan, period: def.billing_period });
    if (def.plan === "free") {
      setConfirmDowngrade(true);
      return;
    }
    if (def.billing_period == null) return;
    setPending(def.id);
    try {
      await upgradeToPro(def.billing_period);
      track("upgraded_to_pro", { period: def.billing_period });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);
      toast.success("You're on Pro", {
        description: "Checkout will be wired to Stripe soon — Pro is unlocked for you now.",
      });
    } catch (e) {
      console.error("[upgrade] failed", e);
      toast.error("Couldn't switch plan", { description: "Please try again." });
    } finally {
      setPending(null);
    }
  }

  const isPro = profile?.plan === "pro";
  const currentPlan = profile?.plan ?? "free";
  const currentPeriod = profile?.billing_period ?? null;

  const portfolioTotal = portfolio.length;
  const portfolioPaused =
    currentPlan === "free" ? Math.max(0, portfolioTotal - FREE_PORTFOLIO_CAP) : 0;
  const portfolioActive = portfolioTotal - portfolioPaused;
  const watchlistActive = watchlist.filter((r) => r.is_active).length;
  const watchlistPaused = watchlist.filter((r) => !r.is_active).length;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] text-foreground">
          Account & security
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Manage how you sign in and how your data is protected.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Account</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            {isLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Signed in as
                </div>
                <div className="mt-1 font-display text-lg font-medium">
                  {profile?.display_name}
                </div>
                <div className="text-sm text-muted-foreground">{profile?.email}</div>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Subscription</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full max-w-2xl" />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Current plan
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-display text-2xl font-semibold tracking-tight">
                        {planLabel(profile?.plan, profile?.billing_period)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-display font-semibold uppercase tracking-widest ${
                          isPro
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-2 text-muted-foreground border border-hairline"
                        }`}
                      >
                        {isPro ? "Active" : "Free"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isPro
                        ? "You have unlimited portfolio and watchlist items, and access to every signal."
                        : "Start free. Upgrade when your collection grows."}
                    </p>
                  </div>

                  {currentPlan === "free" && (
                    <div className="flex flex-col items-end gap-1.5 text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Free usage
                      </div>
                      <div className="font-display text-sm font-medium text-foreground">
                        {portfolioActive} of {FREE_PORTFOLIO_CAP}
                        {portfolioPaused > 0 ? ` (${portfolioPaused} paused)` : ""} portfolio pieces
                      </div>
                      <div className="font-display text-sm font-medium text-foreground">
                        {watchlistActive} of {FREE_ACTIVE_CAP}
                        {watchlistPaused > 0 ? ` (${watchlistPaused} paused)` : ""} watchlist items
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {PLAN_DEFS.map((p) => {
                    const isCurrent =
                      p.plan === currentPlan &&
                      (p.plan === "free" || p.billing_period === currentPeriod);
                    const isPending = pending === p.id;
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-hairline bg-white p-6 flex flex-col relative"
                      >
                        {p.badge ? (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full bg-primary text-primary-foreground">
                            {p.badge}
                          </span>
                        ) : null}

                        <h3 className="font-display font-semibold text-lg">{p.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>

                        <div className="mt-4 flex items-baseline gap-1.5">
                          <span className="font-display font-bold text-3xl tracking-tight">{p.price}</span>
                          <span className="text-sm text-muted-foreground">{p.unit}</span>
                        </div>
                        {p.note ? (
                          <p className="mt-1 text-xs text-positive font-display font-semibold">{p.note}</p>
                        ) : null}

                        <ul className="mt-5 space-y-2.5 flex-1">
                          {p.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-2.5 text-sm">
                              <Check className="h-4 w-4 text-positive mt-0.5 shrink-0" />
                              <span className="text-foreground/90">{b}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6">
                          {isCurrent ? (
                            <div className="w-full rounded-full border border-hairline bg-surface-2 text-center py-2.5 text-sm font-display font-semibold text-muted-foreground">
                              Current plan
                            </div>
                          ) : p.plan === "free" ? (
                            <Button
                              variant="outline"
                              className="w-full rounded-full"
                              onClick={() => handleSelectPlan(p)}
                              disabled={downgrading}
                            >
                              Switch back to Free
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleSelectPlan(p)}
                              disabled={pending !== null}
                              className={`w-full rounded-full ${
                                p.featured || p.id === "pro_annual"
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-foreground text-background hover:bg-foreground/90"
                              }`}
                            >
                              {isPending ? "Unlocking…" : isPro ? "Switch to this plan" : "Choose this plan"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  {isPro
                    ? "Cancel or switch anytime. The full cancel / pause flow arrives with checkout."
                    : "Checkout is coming soon — for now, choosing Pro unlocks it for your account immediately, no card required."}
                </p>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">
            Two-factor authentication
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <TwoFactorEnroll />
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Session</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Sign out on this device.</div>
            <Button variant="outline" onClick={handleLogout} className="rounded-full">
              Log out
            </Button>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmDowngrade} onOpenChange={(o) => !o && setConfirmDowngrade(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch back to Free?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing gets deleted. Watchlist items beyond the first 10 will move to Paused,
              and portfolio items beyond 3 will become read-only. You can upgrade again at
              any time to restore full access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={downgrading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDowngrade} disabled={downgrading}>
              {downgrading ? "Switching…" : "Switch to Free"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
