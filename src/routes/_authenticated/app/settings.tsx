import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Info, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile";

import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  PLAN_DEFS,
  ANNUAL_SAVING_PCT,
  MONTHLY_USD,
  TRIAL_DAYS,
  isTrialing,
  trialDaysLeft,
} from "@/lib/subscription";
import { getNextCharge, formatUsd } from "@/lib/billing-mock";
import {
  SubscriptionStateCard,
  type StateAction,
  type StateRow,
  type Tone,
} from "@/components/settings/SubscriptionStateCard";
import { fetchPortfolio } from "@/lib/portfolio";
import { fetchWatchlist } from "@/lib/watchlist";
import { CancelSubscriptionDialog } from "@/components/settings/CancelSubscriptionDialog";
import { BillingCard } from "@/components/settings/BillingCard";

import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog";
import { SetPasswordDialog } from "@/components/settings/SetPasswordDialog";
import { completeGoogleLink } from "@/lib/link-google";

import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { MutedAlertSourcesCard } from "@/components/settings/MutedAlertSourcesCard";
import { AlertDeliveryCard } from "@/components/settings/AlertDeliveryCard";
import { ManageConnectedAccountsDialog } from "@/components/settings/ManageConnectedAccountsDialog";

import { useMyDeletionRequest } from "@/components/account/PendingDeletionBanner";
import { clearLocalAccountState } from "@/lib/local-reset";

import {
  getSubscriptionMockState,
  onSubscriptionMockChange,
  reactivateSubscription,
  formatEndDate,
  daysUntil,
  type SubscriptionMockState,
} from "@/lib/subscription-mock";

import { SettingsSkeleton } from "@/components/app/PageSkeletons";

export const Route = createFileRoute("/_authenticated/app/settings")({
  pendingComponent: SettingsSkeleton,
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

  const [cancelWizardOpen, setCancelWizardOpen] = useState(false);

  const [mockState, setMockState] = useState<SubscriptionMockState>({ status: "active" });
  useEffect(() => {
    setMockState(getSubscriptionMockState(profile?.id));
    return onSubscriptionMockChange(() => {
      setMockState(getSubscriptionMockState(profile?.id));
    });
  }, [profile?.id]);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [firstPasswordOpen, setFirstPasswordOpen] = useState(false);
  const [connectedOpen, setConnectedOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  // Server-side deletion state; the banner itself lives in DashboardShell.
  const { data: deletionState, refetch: refetchDeletion } = useMyDeletionRequest();

  // Source of truth for which sign-in methods exist.
  const { data: settingsIdentities } = useQuery({
    queryKey: ["auth", "identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data?.identities ?? [];
    },
  });
  const hasEmailIdentity = (settingsIdentities ?? []).some((i) => i.provider === "email");

  // The Google link round trip reloads this page, so this must run on mount
  // regardless of whether the connected-accounts dialog is open.
  useEffect(() => {
    void (async () => {
      const res = await completeGoogleLink();
      if (!res) return;
      if (res.ok) {
        toast.success("Google connected");
        await queryClient.invalidateQueries({ queryKey: ["auth", "identities"] });
      } else {
        toast.error("Couldn't connect Google", { description: res.message });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function handleManageConnected() {
    track("connected_accounts_clicked", {});
    setConnectedOpen(true);
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
    // C1: local keys are browser-global, so anything left here is inherited by
    // the next account signed in on this device. Single list in local-reset.ts.
    clearLocalAccountState();
    navigate({ to: "/login", replace: true });
  }

  async function handleReactivate() {
    if (!profile?.id) return;
    reactivateSubscription(profile.id);
    track("subscription_reactivated", {});
    toast.success("Welcome back to Pro", {
      description: "Your subscription will continue on your next billing date.",
    });
  }

  async function handleCancelledFromWizard() {
    // Wizard already scheduled the cancel in localStorage. Sync UI state.
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["access"] });
  }

  const isPro = profile?.plan === "pro";
  const currentPlan = profile?.plan ?? "free";
  const trialing = isTrialing(profile ?? {});
  const trialDaysLeftValue = trialDaysLeft(profile?.trial_ends_at);

  const monthlyDef = PLAN_DEFS.find((d) => d.id === "pro_monthly");
  const quarterlyDef = PLAN_DEFS.find((d) => d.id === "pro_quarterly");
  const annualDef = PLAN_DEFS.find((d) => d.id === "pro_annual");

  const portfolioTotal = portfolio.length;
  const watchlistTotal = watchlist.length;

  // ---- Subscription state card ----
  // One plan, three billing periods. Prices in PLAN_DEFS are the recurring
  // prices; the monthly trial's first charge is handled separately, while
  // quarterly and annual are charged immediately at their flat term prices.
  const nextCharge = getNextCharge(
    profile?.id,
    profile?.plan,
    profile?.billing_period,
    profile?.trial_ends_at,
  );
  const nextChargeRow: StateRow[] = nextCharge
    ? [
        {
          label: "Next charge",
          value: `${formatUsd(nextCharge.amountUsd)} on ${formatEndDate(nextCharge.date)}`,
        },
      ]
    : [];
  const switchToAnnual: StateAction = {
    label: `Switch to annual · save ${ANNUAL_SAVING_PCT}%`,
    href: "/checkout?plan=annual",
    variant: "primary",
  };
  const cancelAction = (label: string): StateAction => ({
    label,
    onClick: () => setCancelWizardOpen(true),
    variant: "ghost",
  });
  const datedCancelLabel = nextCharge
    ? `Cancel on ${formatEndDate(nextCharge.date)}`
    : "Cancel subscription";

  const stateCard: {
    label: string;
    tone: Tone;
    rows: StateRow[];
    actions: StateAction[];
    tag?: string;
  } =
    trialing
      ? {
          label: "Trial · 14 days",
          tone: "neutral",
          rows: [
            { label: "Plan after trial", value: "Pro · monthly" },
            { label: "Days left", value: `${trialDaysLeftValue}`, big: true },
            {
              label: "Card will be charged",
              value: `${formatUsd(MONTHLY_USD)} on ${formatEndDate(profile?.trial_ends_at ?? undefined)}`,
            },
            { label: "Then", value: `${formatUsd(MONTHLY_USD)} every month` },
          ],
          actions: [
            switchToAnnual,
            cancelAction(`Cancel before ${formatEndDate(profile?.trial_ends_at ?? undefined)}`),
          ],
        }
      : isPro && profile?.billing_period === "quarterly"
        ? {
            label: "Pro · quarterly",
            tone: "accent",
            rows: [
              { label: "Plan", value: "Pro · quarterly" },
              { label: "Price", value: quarterlyDef?.price ?? "", big: true },
              { label: "Per month", value: quarterlyDef?.perMonth ?? "" },
              ...nextChargeRow,
            ],
            actions: [switchToAnnual, cancelAction(datedCancelLabel)],
          }
        : isPro && profile?.billing_period === "annual"
          ? {
              label: "Pro · annual",
              tone: "annual",
              rows: [
                { label: "Plan", value: "Pro · annual" },
                { label: "Price", value: annualDef?.price ?? "", big: true },
                { label: "Per month", value: annualDef?.perMonth ?? "" },
                ...nextChargeRow,
              ],
              actions: [cancelAction(datedCancelLabel)],
            }
          : isPro
            ? {
                label: "Pro · monthly",
                tone: "neutral",
                rows: [
                  { label: "Plan", value: "Pro · monthly" },
                  { label: "Price", value: `${monthlyDef?.price} ${monthlyDef?.unit}`, big: true },
                  ...nextChargeRow,
                ],
                actions: [switchToAnnual, cancelAction(datedCancelLabel)],
              }
            : {
                // No active subscription — the only upgrade path left on this page.
                label: "No subscription",
                tone: "neutral",
                rows: [
                  { label: "Plan", value: "None" },
                  { label: "Portfolio", value: `${portfolioTotal}` },
                  { label: "Brand watchlist", value: `${watchlistTotal}` },
                ],
                actions: [{ label: "See plans", href: "/#pricing", variant: "primary" }],
              };

  // A scheduled cancel keeps the state card but swaps every action for one
  // Reactivate button, and moves the notice inside the card.
  const cancelScheduled = isPro && mockState.status === "cancel_scheduled";
  const cardActions: StateAction[] = cancelScheduled
    ? [{ label: "Reactivate Pro", onClick: () => void handleReactivate(), variant: "primary" }]
    : stateCard.actions;

  const truePeriod: "monthly" | "quarterly" | "annual" =
    profile?.billing_period === "annual"
      ? "annual"
      : profile?.billing_period === "quarterly"
        ? "quarterly"
        : "monthly";

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
        {/* Pending-deletion banner is rendered app-wide by DashboardShell. */}

        <section>
          <h2 className="font-display text-base font-medium mb-3 px-2 text-foreground">Account</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6 space-y-5">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="h-14 w-14 rounded-full bg-primary text-primary-foreground text-base font-display font-semibold inline-flex items-center justify-center shrink-0">
                    {initials || "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      Signed in as
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
                  </div>
                </div>

                <div className="h-px w-full bg-hairline" />

                <div className="space-y-4">
                  <SettingsRow
                    label="Password"
                    value={hasEmailIdentity ? "••••••••" : "Not set"}
                    actionLabel={hasEmailIdentity ? "Change" : "Set"}
                    onAction={() =>
                      hasEmailIdentity ? setPasswordOpen(true) : setFirstPasswordOpen(true)
                    }
                  />

                  <SettingsRow
                    label="Connected accounts"
                    value={<ConnectedAccountsList />}
                    actionLabel="Manage"
                    onAction={handleManageConnected}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Subscription</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full max-w-2xl rounded-2xl" />
          ) : (
            <SubscriptionStateCard
              id="plans"
              label={stateCard.label}
              tone={stateCard.tone}
              rows={stateCard.rows}
              tag={stateCard.tag}
              actions={cardActions}

                banner={
                  <>
                    {trialing && (
                      <div className="mt-4 space-y-2" aria-label="Trial progress">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Trial progress</span>
                          <span>{trialDaysLeftValue} days left</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((TRIAL_DAYS - trialDaysLeftValue) / TRIAL_DAYS) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {cancelScheduled && (
                    <div className="mt-4 rounded-xl border border-alert/30 bg-alert/5 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
                        <div>
                          <div className="font-display text-sm font-semibold text-foreground">
                            Your Pro plan ends on {formatEndDate(mockState.endsAt)}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {daysUntil(mockState.endsAt)} days left. After that your subscription
                            ends — nothing gets deleted.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPro && mockState.saveOfferAcceptedAt && mockState.status === "active" && (
                    <div className="mt-4 rounded-xl border border-positive/30 bg-positive/5 p-4 text-sm">
                      <span className="font-display font-semibold text-positive">
                        {mockState.saveOfferDiscountPct}% off applied
                      </span>{" "}
                      <span className="text-muted-foreground">
                        for the next 3 billing cycles. Thanks for staying.
                      </span>
                    </div>
                  )}
                </>
              }
            />
          )}
        </section>

        <BillingCard
          userId={profile?.id}
          plan={profile?.plan}
          period={profile?.billing_period}
        />


        <NotificationPreferencesCard />
        <AlertDeliveryCard plan={profile?.plan} />
        <MutedAlertSourcesCard />

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-foreground">Session</h2>
          <div className="rounded-2xl border border-hairline bg-surface p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-sm font-semibold text-foreground">Sign out</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ends your session on this device. Your data stays safe — sign back in anytime.
                </p>
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Log out
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-base font-medium mb-3 text-alert">Danger zone</h2>
          <div className="rounded-2xl border border-alert/30 bg-surface p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-sm font-semibold text-foreground">
                  Delete account
                </div>
                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                  Removes your portfolio, brand watchlist, price alerts, and account after a 30-day
                  grace period. You can cancel deletion anytime during that window.
                </p>
              </div>
              <button
                onClick={() => setDeleteAccountOpen(true)}
                disabled={!!deletionState}
                className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-alert hover:underline disabled:opacity-50 disabled:pointer-events-none"
              >
                {deletionState ? "Deletion scheduled" : "Delete account"}
              </button>
            </div>
          </div>
        </section>
      </div>

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
            period={truePeriod}
            onCancelled={handleCancelledFromWizard}
            portfolio={portfolio}
            watchlist={watchlist}
            onSaved={() => {
              /* mock offer accepted, state event refreshes UI */
            }}
          />
          <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
          <SetPasswordDialog
            open={firstPasswordOpen}
            onOpenChange={setFirstPasswordOpen}
            email={profile?.email ?? ""}
            onDone={async () => {
              await queryClient.invalidateQueries({ queryKey: ["auth", "identities"] });
            }}
          />
          <ManageConnectedAccountsDialog
            open={connectedOpen}
            onOpenChange={setConnectedOpen}
            email={profile?.email ?? ""}
          />

          <DeleteAccountDialog
            open={deleteAccountOpen}
            onOpenChange={setDeleteAccountOpen}
            email={profile.email}
            onScheduled={() => void refetchDeletion()}
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
        <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-[15px] text-foreground truncate">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-0.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline shrink-0 transition-colors"
      >
        {actionLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ConnectedAccountsList() {
  const { data: identities, isLoading } = useQuery({
    queryKey: ["auth", "identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data?.identities ?? [];
    },
  });

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Loading…</span>;
  }

  const providers = identities?.map((i) => i.provider) ?? [];
  const hasGoogle = providers.includes("google");
  const hasEmail = providers.includes("email");

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {hasEmail && (
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-0.5 text-[11px] font-display font-semibold">
          Email
        </span>
      )}
      {hasGoogle && (
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2 py-0.5 text-[11px] font-display font-semibold">
          Google
        </span>
      )}
      {!hasGoogle && <span className="text-xs text-muted-foreground">· Google not linked</span>}
    </span>
  );
}
