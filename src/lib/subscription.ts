// Single source of truth for subscription plan + entitlement transitions.
// Currently a temporary direct-flip: upgradeToPro / downgradeToFree simply
// update profiles.plan and profiles.billing_period. When real Stripe lands,
// only these two functions change — the rest of the app reads entitlement
// from profiles.plan / billing_period unchanged.
import { supabase } from "@/integrations/supabase/client";
import { FREE_PORTFOLIO_CAP } from "@/lib/portfolio";
import { FREE_ACTIVE_CAP } from "@/lib/watchlist";

export type Plan = "free" | "pro";
export type BillingPeriod = "monthly" | "quarterly" | "annual";

export type PlanId = "free" | "pro_monthly" | "pro_annual";

export type PlanDef = {
  id: PlanId;
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  note?: string;
  featured?: boolean;
  badge?: string;
  benefits: string[];
  plan: Plan;
  billing_period: BillingPeriod | null;
};

// Matches landing pricing exactly.
export const PLAN_DEFS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    subtitle: "Get started with no commitment",
    price: "$0",
    unit: "/ month",
    plan: "free",
    billing_period: null,
    benefits: [
      "Up to 3 portfolio items",
      "Up to 10 brand watchlist items",
      "Sample price alerts",
      "Manual value tracking",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    subtitle: "Full access · cancel anytime",
    price: "$24.99",
    unit: "/ month",
    featured: true,
    badge: "Most popular",
    plan: "pro",
    billing_period: "monthly",
    benefits: [
      "Unlimited portfolio and brand watchlist",
      "All price alerts — price rises, drops, and new collections",
      "Portfolio dashboard",
      "Advanced notifications and quiet hours",
    ],
  },
  {
    id: "pro_annual",
    name: "Pro Annual",
    subtitle: "Best value for serious collectors",
    price: "$173.88",
    unit: "/ year",
    note: "≈ $14.49 / month · save 42%",
    plan: "pro",
    billing_period: "annual",
    benefits: [
      "Everything in Pro Monthly",
      "Unlimited price alerts and dashboard",
      "Priority support",
      "Future automated value updates",
    ],
  },
];

export function planLabel(
  plan: Plan | undefined,
  period: BillingPeriod | null | undefined,
): string {
  if (plan !== "pro") return "Free";
  if (period === "annual") return "Pro Annual";
  if (period === "quarterly") return "Pro Quarterly";
  if (period === "monthly") return "Pro Monthly";
  return "Pro";
}

// -------- transitions --------

/**
 * Temporary dev flip to Pro. Replace this body with a Stripe checkout
 * redirect later — the surrounding UI and read paths won't need to change.
 */
export async function upgradeToPro(period: BillingPeriod): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ plan: "pro", billing_period: period, trial_ends_at: null } as never)
    .eq("id", uid);
  if (pErr) throw pErr;

  // Re-activate all paused watchlist items. Portfolio has no per-row gate,
  // so lifting the cap alone unlocks over-cap items.
  const { error: wErr } = await supabase
    .from("watchlist")
    .update({ is_active: true })
    .eq("user_id", uid)
    .eq("is_active", false);
  if (wErr) throw wErr;
}

/**
 * Start the 14-day trial. Entitlement is full Pro; `trial_ends_at` is what
 * makes it a trial. Per the pricing policy the trial leads ONLY to monthly —
 * quarterly and annual are bought outright, so no other period is accepted.
 * Replace the body with a Stripe trial subscription later; read paths stay.
 */
export async function startTrial(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ plan: "pro", billing_period: "monthly", trial_ends_at: trialEndsAt } as never)
    .eq("id", uid);
  if (pErr) throw pErr;

  // The trial lifts the caps, so paused watchlist rows come back exactly as
  // they do on a paid upgrade.
  const { error: wErr } = await supabase
    .from("watchlist")
    .update({ is_active: true })
    .eq("user_id", uid)
    .eq("is_active", false);
  if (wErr) throw wErr;
}

/** True when the account is inside its trial window. */
export function isTrialing(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

/**
 * Temporary dev flip back to Free. Real cancel/pause flow (with ARL,
 * two-step confirmation, reminder emails) will replace this alongside
 * Stripe — never delete user data here.
 */
export async function downgradeToFree(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ plan: "free", billing_period: null, trial_ends_at: null } as never)
    .eq("id", uid);
  if (pErr) throw pErr;

  // Re-apply Free watchlist cap: keep the oldest FREE_ACTIVE_CAP active
  // items active, pause every other item. Nothing is deleted.
  const { data: wl, error: wlErr } = await supabase
    .from("watchlist")
    .select("id, created_at, is_active")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  if (wlErr) throw wlErr;

  const rows = wl ?? [];
  const keepActive = new Set(rows.slice(0, FREE_ACTIVE_CAP).map((r) => r.id));
  const toActivate = rows.filter((r) => keepActive.has(r.id) && !r.is_active).map((r) => r.id);
  const toPause = rows.filter((r) => !keepActive.has(r.id) && r.is_active).map((r) => r.id);

  // Pause first, then activate: the DB now enforces the Free active cap on
  // every false->true flip, so freeing the slots must happen before filling
  // them or a legitimate re-activation at the boundary is rejected.
  if (toPause.length > 0) {
    const { error } = await supabase
      .from("watchlist")
      .update({ is_active: false })
      .in("id", toPause);
    if (error) throw error;
  }
  if (toActivate.length > 0) {
    const { error } = await supabase
      .from("watchlist")
      .update({ is_active: true })
      .in("id", toActivate);
    if (error) throw error;
  }

  // Portfolio: nothing to change server-side. Over-cap items become
  // read-only in the UI via `readOnlyPortfolioIds` below while on Free.
}

// Derived Free-tier split for portfolio. Portfolio has no per-row `is_active`
// column; instead, when the account is Free we treat the oldest
// FREE_PORTFOLIO_CAP items as Active and every subsequent item as Paused.
// Pro accounts have all items Active. Nothing here mutates the database —
// downgrade/upgrade just flip `profiles.plan` and this recomputes.
// Oldest-first ordering here is load-bearing, not cosmetic:
//  - `sorted.slice(0, FREE_PORTFOLIO_CAP)` is what makes an item active;
//  - `readOnlyPortfolioIds` derives edit permissions from the same split;
//  - `downgradeToFree` keeps the oldest FREE_ACTIVE_CAP watchlist rows;
//  - `pickPromotion` promotes the oldest paused row.
// The sort is deliberately done here rather than trusted from the caller —
// callers such as CancelSubscriptionDialog pass rows in from elsewhere.
// Therefore any UI sort control must be a presentation-only transform applied
// AFTER this split, never a reordering of its input. Wiring a "newest first"
// toggle at the wrong layer would silently change which items are paused and
// which become read-only — a data-affecting bug dressed as a display preference.
export function splitPortfolioByPlan<T extends { id: string; created_at: string }>(
  rows: T[],
  plan: Plan | undefined,
): { active: T[]; paused: T[] } {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (plan === "pro") return { active: sorted, paused: [] };
  return {
    active: sorted.slice(0, FREE_PORTFOLIO_CAP),
    paused: sorted.slice(FREE_PORTFOLIO_CAP),
  };
}

// Portfolio has no per-row gate; instead we mark the oldest FREE_PORTFOLIO_CAP
// items editable and the rest read-only when the account is Free. Returns the
// set of read-only ids — empty for Pro.
export function readOnlyPortfolioIds(
  rows: Array<{ id: string; created_at: string }>,
  plan: Plan | undefined,
): Set<string> {
  return new Set(splitPortfolioByPlan(rows, plan).paused.map((r) => r.id));
}

// ---- Landing paywall (pricing policy, Aug 2026) ----
// One product, three billing periods. A 14-day trial leads only to monthly;
// quarterly and annual are bought outright at a discount, and the discount is
// the price of skipping the trial. Feature lists are deliberately identical —
// the cards differ only by trial-vs-discount, so nobody has to compare specs.
//
// PLAN_DEFS above remains the provisioning source of truth: what the app can
// actually put an account on today. Quarterly is advertised here but NOT yet
// provisionable — profiles.billing_period is CHECK-constrained to
// monthly|annual and there is no payment provider wired up. When billing
// lands: widen that constraint, add quarterly to BillingPeriod, and fold
// these cards back into PLAN_DEFS so there is one list again.
// Monthly and annual prices are derived from PLAN_DEFS so they cannot drift.

const MONTHLY_PRICE = PLAN_DEFS.find((p) => p.id === "pro_monthly")!.price;
const ANNUAL_PRICE = PLAN_DEFS.find((p) => p.id === "pro_annual")!.price;

export type PaywallCard = {
  id: "trial" | "quarterly" | "annual";
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  note?: string;
  featured?: boolean;
  cta: string;
  href: string;
  fineprint: string;
};

// Identical across all three cards, on purpose.
export const PAYWALL_BENEFITS = [
  "Unlimited portfolio and brand watchlist",
  "All price alerts — price rises, drops, and new collections",
  "Portfolio dashboard",
  "Advanced notifications and quiet hours",
];

export const PAYWALL_CARDS: PaywallCard[] = [
  {
    id: "trial",
    name: "Try it free",
    subtitle: "Full product, nothing charged today",
    price: "14 days",
    unit: "free",
    featured: true,
    cta: "Start 14 days free",
    href: "/quiz?plan=trial",
    fineprint: `Card required. Free for 14 days, then ${MONTHLY_PRICE}/month. Cancel anytime.`,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    subtitle: "Pay up front instead of trialling",
    price: "$22.49",
    unit: "/ month",
    note: "$67.47 every 3 months · save 10%",
    cta: "Get quarterly",
    href: "/quiz?plan=quarterly",
    fineprint: "Charged today. $67.47 every 3 months. No trial. Cancel anytime.",
  },
  {
    id: "annual",
    name: "Annual",
    subtitle: "Best value · pay up front",
    price: "$14.49",
    unit: "/ month",
    note: `${ANNUAL_PRICE} once a year · save 42%`,
    cta: "Get annual",
    href: "/quiz?plan=annual",
    fineprint: `Charged today. ${ANNUAL_PRICE} once a year. No trial. Cancel anytime.`,
  },
];
