// Mock checkout standing in for Stripe Checkout. Replace with a real
// Stripe Checkout Session redirect + webhook when billing lands:
//   - `startMockCheckout` becomes "create session, redirect to Stripe"
//   - `completeMockCheckout` is doing the WEBHOOK's job (provisioning).
//     In production, provisioning MUST move to the webhook handler —
//     never to the browser return path, which the user can skip.
// Nothing here touches a card. There is deliberately no card input in the
// mock UI; a real PAN must never reach this app.

import { PAYWALL_CARDS, startTrial, upgradeToPro } from "@/lib/subscription";

/**
 * Master switch for the mock checkout doors. MUST be false — and the
 * `/checkout` routes removed — before this app takes real money.
 */
export const MOCK_CHECKOUT_ENABLED = true;

export type CheckoutPlan = "trial" | "quarterly" | "annual";

export function parseCheckoutPlan(v: string | null | undefined): CheckoutPlan | null {
  if (v === "trial" || v === "quarterly" || v === "annual") return v;
  return null;
}

export function checkoutCard(plan: CheckoutPlan) {
  return PAYWALL_CARDS.find((c) => c.id === plan);
}

export async function completeMockCheckout(plan: CheckoutPlan): Promise<void> {
  if (plan === "trial") return startTrial();
  if (plan === "quarterly") return upgradeToPro("quarterly");
  return upgradeToPro("annual");
}
