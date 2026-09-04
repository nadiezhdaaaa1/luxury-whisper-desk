// Plan intent, sessionStorage-scoped.
//
// The plan a visitor picked must survive the registration modal, a Google
// redirect round trip, and abandonment — but it must NOT leak across tabs or
// linger for weeks, so sessionStorage (not localStorage) is deliberate.
//
// There is deliberately NO separate "post auth path" key: the OAuth
// `redirect_uri` already carries the destination, and a second, half-read
// mechanism would only be able to disagree with it.
import type { PaywallCard } from "@/lib/subscription";

export type PlanIntent = PaywallCard["id"];

const PLAN_KEY = "pyou:planIntent";

export function isPlanIntent(v: unknown): v is PlanIntent {
  return v === "monthly" || v === "quarterly" || v === "annual";
}

function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePlanIntent(plan: PlanIntent): void {
  try {
    store()?.setItem(PLAN_KEY, plan);
  } catch {
    /* ignore */
  }
}

export function readPlanIntent(): PlanIntent | null {
  try {
    const v = store()?.getItem(PLAN_KEY);
    return isPlanIntent(v) ? v : null;
  } catch {
    return null;
  }
}

/** Call once a subscription is confirmed so a stale intent can never win. */
export function clearPlanIntent(): void {
  try {
    store()?.removeItem(PLAN_KEY);
  } catch {
    /* ignore */
  }
}

export function checkoutPathFor(plan: PlanIntent): string {
  return `/checkout?plan=${plan}`;
}
