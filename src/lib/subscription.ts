// Single source of truth for subscription plan + entitlement transitions.
// Currently a temporary direct-flip: upgradeToPro / downgradeToFree simply
// update profiles.plan and profiles.billing_period. When real Stripe lands,
// only these two functions change — the rest of the app reads entitlement
// from profiles.plan / billing_period unchanged.
import { supabase } from "@/integrations/supabase/client";
import { FREE_PORTFOLIO_CAP } from "@/lib/portfolio";
import { FREE_ACTIVE_CAP } from "@/lib/watchlist";

export type Plan = "free" | "pro";
export type BillingPeriod = "monthly" | "annual";

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
    .update({ plan: "pro", billing_period: period } as never)
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
 */
export async function downgradeToFree(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const uid = auth.user.id;

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ plan: "free", billing_period: null } as never)
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

  if (toActivate.length > 0) {
    const { error } = await supabase
      .from("watchlist")
      .update({ is_active: true })
      .in("id", toActivate);
    if (error) throw error;
  }
  if (toPause.length > 0) {
    const { error } = await supabase
      .from("watchlist")
      .update({ is_active: false })
      .in("id", toPause);
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
