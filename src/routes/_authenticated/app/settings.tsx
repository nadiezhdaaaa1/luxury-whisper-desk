import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, PauseCircle, RotateCcw, Info, AlertTriangle, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
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
import { CancelSubscriptionDialog } from "@/components/settings/CancelSubscriptionDialog";
import { BillingCard } from "@/components/settings/BillingCard";
import { DisplayNameDialog } from "@/components/settings/DisplayNameDialog";
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import {
  cancelDeletion,
  daysUntilDeletion,
  formatDeletionDate,
  getDeletionState,
  onAccountMockChange,
  type DeletionState,
} from "@/lib/account-mock";
import {
  getSubscriptionMockState,
  onSubscriptionMockChange,
  reactivateSubscription,
  resumeSubscription,
  clearSubscriptionMock,
  formatEndDate,
  daysUntil,
  type SubscriptionMockState,
} from "@/lib/subscription-mock";

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
  const [cancelWizardOpen, setCancelWizardOpen] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [pending, setPending] = useState<PlanDef["id"] | null>(null);

  const [mockState, setMockState] = useState<SubscriptionMockState>({ status: "active" });
  useEffect(() => {
    setMockState(getSubscriptionMockState(profile?.id));
    return onSubscriptionMockChange(() => {
      setMockState(getSubscriptionMockState(profile?.id));
    });
  }, [profile?.id]);

  const [displayNameOpen, setDisplayNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deletionState, setDeletionState] = useState<DeletionState | null>(null);

  useEffect(() => {
    setDeletionState(getDeletionState());
    return onAccountMockChange(() => setDeletionState(getDeletionState()));
  }, []);

  function handleCancelDeletion() {
    cancelDeletion();
    track("account_deletion_cancelled", {});
    toast.success("Account deletion cancelled", {
      description: "Your account and data are safe.",
    });
  }

  function handleEmailChangeStub() {
    track("email_change_clicked", {});
    toast.info("Email changes are coming soon", {
      description: "We'll send a verification link to both addresses when this ships.",
    });
  }

  function handleManageSocialStub() {
    track("connected_accounts_clicked", {});
    toast.info("Social account linking is coming soon");
  }


  const initials = (profile?.display_name || profile?.email || "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

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
      if (profile?.id) clearSubscriptionMock(profile.id);
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

  async function handleReactivate() {
    if (!profile?.id) return;
    reactivateSubscription(profile.id);
    track("subscription_reactivated", {});
    toast.success("Welcome back to Pro", {
      description: "Your subscription will continue on your next billing date.",
    });
  }

  async function handleResume() {
    if (!profile?.id) return;
    resumeSubscription(profile.id);
    track("subscription_resumed", {});
    toast.success("Pro resumed", { description: "All Pro features are active again." });
  }

  async function handleCancelledFromWizard() {
    // Wizard already scheduled the cancel in localStorage. Sync UI state.
    await queryClient.invalidateQueries({ queryKey: ["me"] });
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
        description: "Unlimited portfolio and watchlist, every signal, priority support. Enjoy.",
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

  const otherPlans = PLAN_DEFS.filter(
    (p) => !(p.plan === currentPlan && (p.plan === "free" || p.billing_period === currentPeriod)),
  );

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
        {deletionState && (
          <div className="rounded-2xl border-2 border-alert/40 bg-alert/5 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
                <div>
                  <div className="font-display text-sm font-semibold text-foreground">
                    Account scheduled for deletion on {formatDeletionDate(deletionState.deleteAt)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {daysUntilDeletion(deletionState.deleteAt)} days left. After that, everything is permanently removed. Change your mind anytime before then.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleCancelDeletion} className="rounded-full">
                Cancel deletion
              </Button>
            </div>
          </div>
        )}

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Account</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6 space-y-5">
            {isLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="h-12 w-12 rounded-full bg-primary text-primary-foreground text-sm font-display font-semibold inline-flex items-center justify-center shrink-0">
                    {initials || "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Signed in as
                    </div>
                    <div className="mt-1 font-display text-lg font-medium truncate">
                      {profile?.display_name || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
                  </div>
                </div>

                <div className="h-px w-full bg-hairline" />

                <div className="space-y-3">
                  <SettingsRow
                    label="Display name"
                    value={profile?.display_name || "Not set"}
                    actionLabel="Edit"
                    onAction={() => setDisplayNameOpen(true)}
                  />
                  <SettingsRow
                    label="Email address"
                    value={profile?.email ?? ""}
                    actionLabel="Change"
                    onAction={handleEmailChangeStub}
                    hint="Email changes go through a verification link — coming soon."
                  />
                  <SettingsRow
                    label="Password"
                    value="••••••••"
                    actionLabel="Change"
                    onAction={() => setPasswordOpen(true)}
                  />
                  <SettingsRow
                    label="Connected accounts"
                    value={<ConnectedAccountsList />}
                    actionLabel="Manage"
                    onAction={handleManageSocialStub}
                  />
                </div>

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
                {isPro && mockState.status === "cancel_scheduled" && (
                  <div className="mb-5 rounded-xl border border-alert/30 bg-alert/5 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
                        <div>
                          <div className="font-display text-sm font-semibold text-foreground">
                            Your Pro plan ends on {formatEndDate(mockState.endsAt)}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {daysUntil(mockState.endsAt)} days left. After that you'll switch to Free — nothing gets deleted.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleReactivate}
                        className="rounded-full"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Reactivate Pro
                      </Button>
                    </div>
                  </div>
                )}

                {isPro && mockState.status === "paused" && (
                  <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <div className="font-display text-sm font-semibold text-foreground">
                            Pro paused until {formatEndDate(mockState.pausedUntil)}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Auto-resumes in {daysUntil(mockState.pausedUntil)} days. No charges while paused.
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={handleResume} className="rounded-full">
                        Resume now
                      </Button>
                    </div>
                  </div>
                )}

                {isPro && mockState.saveOfferAcceptedAt && mockState.status === "active" && (
                  <div className="mb-5 rounded-xl border border-positive/30 bg-positive/5 p-4 text-sm">
                    <span className="font-display font-semibold text-positive">
                      {mockState.saveOfferDiscountPct}% off applied
                    </span>{" "}
                    <span className="text-muted-foreground">
                      for the next 3 billing cycles. Thanks for staying.
                    </span>
                  </div>
                )}

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
                          mockState.status === "cancel_scheduled"
                            ? "bg-alert/10 text-alert border border-alert/30"
                            : mockState.status === "paused"
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : isPro
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-2 text-muted-foreground border border-hairline"
                        }`}
                      >
                        {mockState.status === "cancel_scheduled"
                          ? "Ending soon"
                          : mockState.status === "paused"
                          ? "Paused"
                          : isPro
                          ? "Active"
                          : "Free"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isPro
                        ? "You have unlimited portfolio and watchlist items, and access to every signal."
                        : "Start free. Upgrade when your collection grows."}
                    </p>
                    {isPro && mockState.status === "active" && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Your plan renews automatically. Manage billing below.
                      </p>
                    )}
                  </div>


                  <div className="flex flex-col items-end gap-3 text-right ml-auto lg:ml-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-sans">
                      {isPro ? "Plan usage" : "Free usage"}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="inline-flex items-baseline gap-px font-display text-2xl font-bold tracking-tight text-foreground leading-none">
                          <span>{portfolioActive}</span>
                          <span className="text-base text-muted-foreground font-sans font-normal">/</span>
                          <span className="text-base text-muted-foreground font-sans font-normal">
                            {isPro ? "∞" : FREE_PORTFOLIO_CAP}
                          </span>
                          {portfolioPaused > 0 && (
                            <span className="ml-1 text-[11px] text-alert font-sans">
                              ({portfolioPaused} paused)
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-sans">portfolio pieces</div>
                      </div>
                      <div className="h-8 w-px bg-hairline" />
                      <div className="text-right">
                        <div className="inline-flex items-baseline gap-px font-display text-2xl font-bold tracking-tight text-foreground leading-none">
                          <span>{watchlistActive}</span>
                          <span className="text-base text-muted-foreground font-sans font-normal">/</span>
                          <span className="text-base text-muted-foreground font-sans font-normal">
                            {isPro ? "∞" : FREE_ACTIVE_CAP}
                          </span>
                          {watchlistPaused > 0 && (
                            <span className="ml-1 text-[11px] text-alert font-sans">
                              ({watchlistPaused} paused)
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-sans">watchlist items</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-6 grid grid-cols-1 gap-4 ${
                    otherPlans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
                  }`}
                >
                  {otherPlans.map((p) => {
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
                        {p.id === "pro_annual" ? (
                          <span className="absolute top-3 right-3 text-[10px] font-display font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-positive/10 text-positive border border-positive/30">
                            Save 42%
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
                          {p.plan === "free" ? (
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
                    ? "Switch plans anytime — proration is calculated automatically."
                    : "Choose a plan to unlock Pro. Prices in USD. Taxes may apply at checkout."}
                </p>

                {isPro && mockState.status === "active" && (
                  <div className="mt-5 rounded-2xl border border-hairline bg-surface p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-display text-sm font-semibold text-foreground">
                          Need to make changes?
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          You can pause, switch, or cancel without losing your data.
                        </p>
                      </div>
                      <button
                        onClick={() => setCancelWizardOpen(true)}
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-alert hover:underline"
                      >
                        Cancel subscription
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <BillingCard
          userId={profile?.id}
          plan={profile?.plan}
          period={profile?.billing_period}
        />

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">
            Two-factor authentication
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <TwoFactorEnroll />
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-alert">Danger zone</h2>
          <div className="rounded-2xl border border-alert/30 bg-surface p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-sm font-semibold text-foreground">
                  Delete account
                </div>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  Removes your portfolio, watchlist, signals, and account after a 30-day grace period. You can cancel deletion anytime during that window.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteAccountOpen(true)}
                disabled={!!deletionState}
                className="rounded-full border-alert/40 text-alert hover:bg-alert/5 hover:text-alert shrink-0"
              >
                {deletionState ? "Deletion scheduled" : "Delete account"}
              </Button>
            </div>
          </div>
        </section>
        <NotificationPreferencesCard />


        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Session</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-sm font-semibold text-foreground">Sign out</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ends your session on this device. Your data stays safe — sign back in anytime.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setConfirmLogout(true)}
                className="rounded-full shrink-0"
              >
                Log out
              </Button>
            </div>
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


      <AlertDialog open={confirmLogout} onOpenChange={(o) => !o && setConfirmLogout(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out on this device. Your data stays safe — sign back in anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {profile?.id && (
        <>
          <CancelSubscriptionDialog
            open={cancelWizardOpen}
            onOpenChange={setCancelWizardOpen}
            userId={profile.id}
            period={profile.billing_period === "annual" ? "annual" : "monthly"}
            onCancelled={handleCancelledFromWizard}
            onSaved={() => { /* mock offer accepted, state event refreshes UI */ }}
            onPaused={() => { /* mock pause, state event refreshes UI */ }}
          />
          <DisplayNameDialog
            open={displayNameOpen}
            onOpenChange={setDisplayNameOpen}
            currentName={profile.display_name ?? ""}
            userId={profile.id}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["me"] })}
          />
          <ChangePasswordDialog
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
          />
          <DeleteAccountDialog
            open={deleteAccountOpen}
            onOpenChange={setDeleteAccountOpen}
            email={profile.email}
            onScheduled={() => setDeletionState(getDeletionState())}
          />
        </>
      )}
    </div>
  );
}

function SettingsRow({
  label,
  value,
  actionLabel,
  onAction,
  hint,
}: {
  label: string;
  value: ReactNode;
  actionLabel: string;
  onAction: () => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm text-foreground truncate">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-display font-semibold text-primary hover:bg-primary/5 shrink-0"
      >
        {actionLabel}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ConnectedAccountsList() {
  // Mock — real implementation reads supabase.auth.getUser().identities.
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-0.5 text-[11px] font-display font-semibold">
        Email
      </span>
      <span className="text-xs text-muted-foreground">
        · Google not linked
      </span>
    </span>
  );
}

