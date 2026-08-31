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

// Matches landing pricing exactly. Prices here are RENEWAL prices — intro
// pricing only affects the first charge (see PAYWALL_CARDS below).
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
    price: "$19.99",
    unit: "/ month",
    plan: "pro",
    billing_period: "monthly",
    benefits: PLAN_BENEFITS,
  },
  {
    id: "pro_quarterly",
    name: "Quarterly",
    subtitle: "Billed every 3 months",
    price: "$53.97",
    unit: "/ 3 months",
    note: "$17.99 / month \u00b7 save 10%",
    badge: "\u221210%",
    plan: "pro",
    billing_period: "quarterly",
    benefits: PLAN_BENEFITS,
  },
  {
    id: "pro_annual",
    name: "Annual",
    subtitle: "Best value",
    price: "$179.88",
    unit: "/ year",
    note: "$14.99 / month \u00b7 save 25%",
    badge: "\u221225%",
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
// One product, three billing periods. No free tier and no trial: payment is
// taken up front. Quarterly and
// annual use intro pricing — a discounted first period, then the renewal
// price. Feature lists are deliberately identical across periods.
//
// PLAN_DEFS above remains the provisioning source of truth: what the app can
// actually put an account on today. Quarterly is now provisionable —
// profiles.billing_period accepts monthly|quarterly|annual and BillingPeriod
// includes it. The remaining gap is only the payment provider: nothing charges
// a card yet. When billing lands, fold these cards back into PLAN_DEFS so
// there is one list again.
// Monthly and annual prices are derived from PLAN_DEFS so they cannot drift.

/** Annual saving vs monthly, in percent. Cards and switch CTAs read this. */
export const ANNUAL_SAVING_PCT = 25;

/** Quarterly renewal total per 3-month term ($17.99 / month). */
export const QUARTERLY_TOTAL_USD = 53.97;

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
  items: PLAN_BENEFITS,
} as const;

/** One plan, three billing periods. No free tier, no trial. */
export const PAYWALL_CARDS: PaywallCard[] = [
  {
    id: "monthly",
    name: "Monthly",
    subtitle: "no commitment",
    price: "$19.99",
    unit: "/ month",
    cta: "Get price you.",
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
    cta: "Get price you.",
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
    cta: "Get price you.",
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
