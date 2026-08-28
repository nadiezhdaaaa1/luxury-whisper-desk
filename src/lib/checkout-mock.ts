// Mock checkout standing in for Stripe Checkout. Replace with a real
// Stripe Checkout Session redirect + webhook when billing lands:
//   - `startMockCheckout` becomes "create session, redirect to Stripe"
//   - `completeMockCheckout` is doing the WEBHOOK's job (provisioning), and
//     it now does it SERVER-SIDE, which is the only reason it works at all:
//     the `enforce_plan_immutable` trigger on profiles blocks plan and
//     billing_period changes from the browser by design. The privileged
//     update lives in `mockProvision` (src/lib/mock-provision.functions.ts),
//     which verifies the caller's own identity from the bearer token.
//     In production, provisioning MUST move to the webhook handler —
//     never to the browser return path, which the user can skip.
// Nothing here touches a card. There is deliberately no card input in the
// mock UI; a real PAN must never reach this app.

import { PAYWALL_CARDS } from "@/lib/subscription";
import { mockProvision } from "@/lib/mock-provision.functions";

/**
 * Master switch for the mock checkout doors. MUST be false — and the
 * `/checkout` routes removed — before this app takes real money.
 */
export const MOCK_CHECKOUT_ENABLED = true;

export type CheckoutPlan = "monthly" | "quarterly" | "annual";

export function parseCheckoutPlan(v: string | null | undefined): CheckoutPlan | null {
  if (v === "monthly" || v === "quarterly" || v === "annual") return v;
  return null;
}

export function checkoutCard(plan: CheckoutPlan) {
  return PAYWALL_CARDS.find((c) => c.id === plan);
}

export async function completeMockCheckout(plan: CheckoutPlan): Promise<void> {
  try {
    await mockProvision({ data: { plan } });
  } catch (e) {
    // Surface the server-side message so the checkout page's inline error is useful.
    throw new Error(e instanceof Error && e.message ? e.message : "Provisioning failed");
  }
}
