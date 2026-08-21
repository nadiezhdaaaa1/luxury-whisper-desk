// Single source of truth for subscription plan + entitlement transitions.
// Currently a temporary direct-flip: upgradeToPro / downgradeToFree simply
// update profiles.plan and profiles.billing_period. When real Stripe lands,
// only these two functions change — the rest of the app reads entitlement
// from profiles.plan / billing_period unchanged.
import { supabase } from "@/integrations/supabase/client";

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
  // The Free plan is no longer offered on the paywall (trial / quarterly /
  // annual only). This entry exists solely so accounts whose profiles.plan is
  // still 'free' render a name and price instead of blank.
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
// NOTE: cannot succeed from the browser — the `enforce_plan_immutable` trigger blocks it; the mock path goes through the `mockProvision` server function.
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
// NOTE: cannot succeed from the browser — the `enforce_plan_immutable` trigger blocks it; the mock path goes through the `mockProvision` server function.
export async function startTrial(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

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
 *
 * Clears plan / billing_period / trial_ends_at and nothing else. There is no
 * Free-tier cap any more, so cancelling must never pause a watchlist row or
 * make a portfolio item read-only: `watchlist.is_active` is a pause the user
 * chose, and the app must not touch it on their behalf.
 */
export async function downgradeToFree(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ plan: "free", billing_period: null, trial_ends_at: null } as never)
    .eq("id", auth.user.id);
  if (pErr) throw pErr;
}

// ---- Landing paywall (pricing policy, Aug 2026) ----
//
// NOTHING CURRENTLY GATES ACCESS. The Free-tier caps (3 portfolio items, 10
// active watchlist rows, enforced both client-side and by database triggers)
// were the only entitlement enforcement in the app, and they were removed when
// the Free plan was retired. Every account — including one still carrying
// profiles.plan = 'free' — has unlimited portfolio and watchlist today. This is
// deliberate for now; the real gate arrives with billing, at which point
// entitlement should be derived from profiles.plan / billing_period again.
//
// One product, three billing periods. A 14-day trial leads only to monthly;
// quarterly and annual are bought outright at a discount, and the discount is
// the price of skipping the trial. Feature lists are deliberately identical —
// the cards differ only by trial-vs-discount, so nobody has to compare specs.
//
// PLAN_DEFS above remains the provisioning source of truth: what the app can
// actually put an account on today. Quarterly is now provisionable —
// profiles.billing_period accepts monthly|quarterly|annual and BillingPeriod
// includes it. The remaining gap is only the payment provider: nothing charges
// a card yet. When billing lands, fold these cards back into PLAN_DEFS so
// there is one list again.
// Monthly and annual prices are derived from PLAN_DEFS so they cannot drift.

/** Trial length in days. Single source: startTrial() and the checkout pages both read this. */
export const TRIAL_DAYS = 14;

/** Annual saving vs monthly, in percent. Cards and switch CTAs read this. */
export const ANNUAL_SAVING_PCT = 42;

/** Quarterly total per 3-month term. The per-month figure on the card is this / 3. */
export const QUARTERLY_TOTAL_USD = 67.47;

const QUARTERLY_TOTAL_PRICE = `$${QUARTERLY_TOTAL_USD.toFixed(2)}`;

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

/**
 * Identical on all three cards, deliberately. The plans differ only by billing
 * period, so a tickable feature list would imply a comparison that doesn't exist.
 *
 * The scope ("the brands you follow") is front-loaded rather than trailing the
 * list: as a line after the bullets it read as an orphaned fifth item, and it
 * has to stay adjacent to "about:" or the four items lose what they attach to.
 */
export const PAYWALL_SIGNALS = {
  lead: "For the brands you follow, signals about:",
  items: ["price rises", "discounts", "sales", "new collections"],
} as const;

export const PAYWALL_CARDS: PaywallCard[] = [
  {
    id: "trial",
    name: "Try it free",
    subtitle: "Full product, nothing charged today",
    price: `${TRIAL_DAYS} days`,
    unit: "free",
    featured: true,
    cta: `Start ${TRIAL_DAYS} days free`,
    note: `then ${MONTHLY_PRICE} monthly`,
    href: "/checkout?plan=trial",
    fineprint: `Card required. Free for ${TRIAL_DAYS} days, then ${MONTHLY_PRICE}/month. Cancel anytime.`,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    subtitle: "Pay up front instead of trialling",
    price: "$22.49",
    unit: "/ month",
    note: `${QUARTERLY_TOTAL_PRICE} every 3 months · save 10%`,
    cta: "Get quarterly",
    href: "/checkout?plan=quarterly",
    fineprint: `Charged today. ${QUARTERLY_TOTAL_PRICE} every 3 months. No trial. Cancel anytime.`,
  },
  {
    id: "annual",
    name: "Annual",
    subtitle: "Best value · pay up front",
    price: "$14.49",
    unit: "/ month",
    note: `${ANNUAL_PRICE} once a year · save ${ANNUAL_SAVING_PCT}%`,
    cta: "Get annual",
    href: "/checkout?plan=annual",
    fineprint: `Charged today. ${ANNUAL_PRICE} once a year. No trial. Cancel anytime.`,
  },
];

/** What the customer is actually charged at checkout. null = nothing today (trial). */
export function chargedTodayUsd(plan: "trial" | "quarterly" | "annual"): number | null {
  if (plan === "trial") return null;
  if (plan === "quarterly") return QUARTERLY_TOTAL_USD;
  const parsed = Number.parseFloat(ANNUAL_PRICE.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
