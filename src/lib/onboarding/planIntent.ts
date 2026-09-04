// Plan intent + post-auth destination, both sessionStorage-scoped.
//
// The plan a visitor picked must survive the registration modal, a Google
// redirect round trip, and abandonment — but it must NOT leak across tabs or
// linger for weeks, so sessionStorage (not localStorage) is deliberate.
import type { PaywallCard } from "@/lib/subscription";

export type PlanIntent = PaywallCard["id"];

const PLAN_KEY = "pyou:planIntent";
const POST_AUTH_KEY = "pyou:postAuthPath";

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

export function clearPlanIntent(): void {
  try {
    store()?.removeItem(PLAN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Where to land after an OAuth redirect. MUST always point at a public route
 * that never re-opens the registration modal, or the return trip loops.
 *
 * Cleared on EVERY auth outcome — success, error, and modal close — so an
 * unrelated sign-in later in the same tab cannot inherit it.
 */
export function setPostAuthPath(path: string): void {
  try {
    store()?.setItem(POST_AUTH_KEY, path);
  } catch {
    /* ignore */
  }
}

export function takePostAuthPath(): string | null {
  try {
    const s = store();
    const v = s?.getItem(POST_AUTH_KEY) ?? null;
    s?.removeItem(POST_AUTH_KEY);
    return v;
  } catch {
    return null;
  }
}

export function clearPostAuthPath(): void {
  try {
    store()?.removeItem(POST_AUTH_KEY);
  } catch {
    /* ignore */
  }
}

export function checkoutPathFor(plan: PlanIntent): string {
  return `/checkout?plan=${plan}`;
}
