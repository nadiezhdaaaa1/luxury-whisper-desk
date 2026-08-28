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

export type PaywallCard = {
  id: "monthly" | "quarterly" | "annual";
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  /** Small pill on the card (e.g. the discount). */
  badge?: string;
  /** Renewal price after the intro period. */
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
  items: [
    "Sales and discounts",
    "New collections and drops",
    "Bags \u00b7 jewelry \u00b7 watches",
    "Up to 25 brands per category",
    "Unlimited watchlist",
    "Unlimited instant alerts",
    "Weekly digest",
  ],
} as const;

/** One plan, three billing periods. No free tier, no trial. */
export const PAYWALL_CARDS: PaywallCard[] = [
  {
    id: "monthly",
    name: "Monthly",
    subtitle: "no commitment",
    price: "$19.99",
    unit: "/ month",
    cta: "Get Price.you",
    href: "/checkout?plan=monthly",
    disclosure: "Charged today. $19.99/month. Cancel anytime.",
  },
  {
    id: "quarterly",
    name: "Quarterly",
    badge: "\u221210%",
    subtitle: "$47.97 for your first quarter",
    price: "$15.99",
    unit: "/ month",
    renewal: "then $17.99/month \u00b7 $53.97 every 3 months",
    cta: "Get Price.you",
    href: "/checkout?plan=quarterly",
    disclosure:
      "Charged today. $47.97 for your first quarter, then $53.97 every 3 months. Cancel anytime.",
  },
  {
    id: "annual",
    name: "Annual",
    badge: "\u221225%",
    flag: "Best value",
    subtitle: "$155.88 for your first year",
    price: "$12.99",
    unit: "/ month",
    renewal: "then $14.99/month \u00b7 $179.88/year",
    featured: true,
    cta: "Get Price.you",
    href: "/checkout?plan=annual",
    disclosure:
      "Charged today. $155.88 for your first year, then $179.88/year. Cancel anytime.",
  },
];

const CHARGED_TODAY_USD: Record<PaywallCard["id"], number> = {
  monthly: 19.99,
  quarterly: 47.97,
  annual: 155.88,
};

/** What the customer is actually charged at checkout today. */
export function chargedTodayUsd(plan: PaywallCard["id"]): number | null {
  return CHARGED_TODAY_USD[plan] ?? null;
}
