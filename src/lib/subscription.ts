// Single source of truth for subscription plan + entitlement transitions.
// Currently a temporary direct-flip: upgradeToPro / downgradeToFree simply
// update profiles.plan and profiles.billing_period. When real Stripe lands,
// only these two functions change — the rest of the app reads entitlement
// from profiles.plan / billing_period unchanged.
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "pro";
export type BillingPeriod = "monthly" | "quarterly" | "annual";

export type PlanId = "free" | "pro_monthly" | "pro_quarterly" | "pro_annual";

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

/**
 * The one feature list. Identical on every billing period — the periods
 * differ only in price, never in features — and shared with the landing
 * paywall cards so the two can never drift.
 */
export const PLAN_BENEFITS: string[] = [
  "Sales and discounts",
  "New collections and drops",
  "Bags \u00b7 jewelry \u00b7 watches",
  "Up to 25 brands per category",
  "Unlimited watchlist",
  "Unlimited instant alerts",
  "Weekly digest",
];

// Matches landing pricing exactly. These are the flat recurring prices for
// each billing period. There is no intro/first-period pricing any more:
// quarterly and annual charge the same amount every term.
export const PLAN_DEFS: PlanDef[] = [
  // The Free plan is no longer offered. This entry exists solely so accounts
  // whose profiles.plan is still 'free' render a name and price instead of blank.
  {
    id: "free",
    name: "Free",
    subtitle: "No active subscription",
    price: "$0",
    unit: "/ month",
    plan: "free",
    billing_period: null,
    benefits: [],
  },
  {
    id: "pro_monthly",
    name: "Monthly",
    subtitle: "No commitment · cancel anytime",
    price: "$24.99",
    unit: "/ month",
    plan: "pro",
    billing_period: "monthly",
    benefits: PLAN_BENEFITS,
  },
  {
    id: "pro_quarterly",
    name: "Quarterly",
    subtitle: "Billed every 3 months",
    price: "$67.47",
    unit: "/ 3 months",
    note: "$22.49 / month \u00b7 save 10%",
    badge: "\u221210%",
    plan: "pro",
    billing_period: "quarterly",
    benefits: PLAN_BENEFITS,
  },
  {
    id: "pro_annual",
    name: "Annual",
    subtitle: "Best value",
    price: "$173.88",
    unit: "/ year",
    note: "$14.49 / month \u00b7 save 42%",
    badge: "\u221242%",
    featured: true,
    plan: "pro",
    billing_period: "annual",
    benefits: PLAN_BENEFITS,
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
 * Start the 14-day free trial. Trial is monthly-only: it sets
 * billing_period = "monthly" and trial_ends_at = now + TRIAL_DAYS days.
 * At conversion, `upgradeToPro("monthly")` clears trial_ends_at.
 */
// NOTE: cannot succeed from the browser — the `enforce_plan_immutable` trigger blocks it; the mock path goes through the `mockProvision` server function.
export async function startTrial(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      plan: "pro",
      billing_period: "monthly",
      trial_ends_at: trialEndsAt,
    } as never)
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
// One product, two mutually exclusive branches:
//
//   Branch A — try free. A 14-day free trial, card required, $0 charged today.
//   The trial leads ONLY to monthly: at day 14 it converts to $24.99/month at
//   full price. There is no trial on any other period.
//
//   Branch B — pay now, pay less. Quarterly and annual are bought immediately
//   with NO trial. The discount IS the payment for forgoing the trial.
//
// Intro / first-period pricing is gone entirely: quarterly and annual are flat
// recurring prices, not a discounted first term. Feature lists are deliberately
// identical across periods.
//
// PLAN_DEFS above remains the provisioning source of truth: what the app can
// actually put an account on today. Quarterly is now provisionable —
// profiles.billing_period accepts monthly|quarterly|annual and BillingPeriod
// includes it. The remaining gap is only the payment provider: nothing charges
// a card yet. When billing lands, fold these cards back into PLAN_DEFS so
// there is one list again.
// Monthly and annual prices are derived from PLAN_DEFS so they cannot drift.

/** Full monthly price, charged after the 14-day trial converts. */
export const MONTHLY_USD = 24.99;

/** Annual saving vs monthly, in percent ($14.49 vs $24.99). */
export const ANNUAL_SAVING_PCT = 42;

/** Quarterly saving vs monthly, in percent ($22.49 vs $24.99). */
export const QUARTERLY_SAVING_PCT = 10;

/** Quarterly total per 3-month term ($22.49 / month). Flat, not intro. */
export const QUARTERLY_TOTAL_USD = 67.47;

/** Annual total per year ($14.49 / month). Flat, not intro. */
export const ANNUAL_TOTAL_USD = 173.88;

/** Length of the free trial, in days. Monthly only. */
export const TRIAL_DAYS = 14;

/** Day of the trial on which the pre-charge reminder fires (day 11 of 14). */
export const TRIAL_REMINDER_DAY = 11;

export type PaywallCard = {
  id: "monthly" | "quarterly" | "annual";
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  /** Small pill on the card (e.g. the discount). */
  badge?: string;
  /** Short line under the price (e.g. "no trial"). */
  renewal?: string;
  /** Highlighted strip above the featured card. */
  flag?: string;
  featured?: boolean;
  cta: string;
  href: string;
  /**
   * FTC negative-option disclosure. Rendered at benefit-list size and weight,
   * never as fine print — the amount billed today and the renewal amount must
   * be no less prominent than the per-month price.
   */
  disclosure: string;
};

/**
 * Identical on all three cards, deliberately. The periods differ only in
 * price, never in features, so a per-card comparison would imply a difference
 * that does not exist.
 */
export const PAYWALL_SIGNALS = {
  lead: "Everything included:",
  items: PLAN_BENEFITS,
} as const;

/**
 * Two branches: a 14-day free trial that leads only to monthly, and
 * pay-now quarterly / annual with no trial.
 *
 * Two deliberate deviations from the pricing strategy document:
 *  - The document puts the discount in the savings line ("−10% · no trial").
 *    We keep the discount in the BADGE PILL because that is what the Figma
 *    comp specifies, so `renewal` carries only "no trial" — stating −10%
 *    twice on one card would be redundant.
 *  - `flag: "Best value"` stays on ANNUAL, not on the trial card. The document
 *    highlights the trial card, but our Figma comp's featured treatment is the
 *    ribbon on annual, and −42% makes "Best value" factually correct. This was
 *    the user's explicit decision.
 */
export const PAYWALL_CARDS: PaywallCard[] = [
  {
    id: "monthly",
    name: "Try",
    price: "14 days",
    unit: "free",
    subtitle: "then $24.99/month",
    cta: "Start 14 days free",
    href: "/checkout?plan=monthly",
    disclosure: "Card required. Free for 14 days, then $24.99/month. Cancel anytime.",
  },
  {
    id: "quarterly",
    name: "Quarterly",
    badge: "\u221210%",
    price: "$22.49",
    unit: "/ month",
    subtitle: "$67.47 every 3 months",
    renewal: "no trial",
    cta: "Get quarterly",
    href: "/checkout?plan=quarterly",
    disclosure: "Charged today. $67.47 every 3 months. Cancel anytime.",
  },
  {
    id: "annual",
    name: "Annual",
    badge: "\u221242%",
    flag: "Best value",
    price: "$14.49",
    unit: "/ month",
    subtitle: "$173.88 once a year",
    renewal: "no trial",
    featured: true,
    cta: "Get annual",
    href: "/checkout?plan=annual",
    disclosure: "Charged today. $173.88 once a year. Cancel anytime.",
  },
];

// Monthly is 0 BECAUSE it enters via the 14-day free trial: nothing is charged
// today, only the card is collected. This is the FTC-relevant number shown at
// checkout and it must not silently drift back to a monthly price — if the
// trial branch is ever removed, change the policy and this number together.
const CHARGED_TODAY_USD: Record<PaywallCard["id"], number> = {
  monthly: 0,
  quarterly: QUARTERLY_TOTAL_USD,
  annual: ANNUAL_TOTAL_USD,
};

/** What the customer is actually charged at checkout today. */
export function chargedTodayUsd(plan: PaywallCard["id"]): number | null {
  return CHARGED_TODAY_USD[plan] ?? null;
}
