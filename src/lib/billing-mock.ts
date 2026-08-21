// Frontend-only billing mock — invoices, payment method, next charge.
// Real Stripe integration replaces this file. All amounts are USD.

import { getSubscriptionMockState } from "@/lib/subscription-mock";

export type Invoice = {
  id: string;
  date: string; // ISO
  amountUsd: number;
  period: "monthly" | "quarterly" | "annual";
  status: "paid" | "refunded";
  receiptUrl?: string;
};

export type PaymentMethod = {
  brand: "visa" | "mastercard" | "amex";
  last4: string;
  expMonth: number;
  expYear: number;
};

export const MOCK_PAYMENT_METHOD: PaymentMethod = {
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2028,
};

const MONTHLY_USD = 24.99;
const QUARTERLY_USD = 67.47;
const ANNUAL_USD = 173.88;

/**
 * Build a deterministic invoice history for the given user based on their
 * current plan. Real Stripe returns the actual list — this reproduces a
 * plausible history so every Pro user sees at least 2 receipts.
 */
export function getMockInvoices(
  userId: string | undefined,
  plan: "free" | "pro" | undefined,
  period: "monthly" | "quarterly" | "annual" | null | undefined,
): Invoice[] {
  if (!userId || plan !== "pro") return [];
  const amount =
    period === "annual" ? ANNUAL_USD : period === "quarterly" ? QUARTERLY_USD : MONTHLY_USD;
  const cycles = period === "annual" ? 2 : period === "quarterly" ? 3 : 4;
  const now = new Date();
  const step = period === "annual" ? 12 : period === "quarterly" ? 3 : 1;
  const invoices: Invoice[] = [];
  for (let i = 0; i < cycles; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i * step);
    invoices.push({
      id: `inv_${userId.slice(0, 6)}_${i}`,
      date: d.toISOString(),
      amountUsd: amount,
      period: period === "annual" ? "annual" : period === "quarterly" ? "quarterly" : "monthly",
      status: "paid",
    });
  }
  return invoices;
}

export function getNextCharge(
  userId: string | undefined,
  plan: "free" | "pro" | undefined,
  period: "monthly" | "quarterly" | "annual" | null | undefined,
): { date: string; amountUsd: number } | null {
  if (!userId || plan !== "pro") return null;
  const mock = getSubscriptionMockState(userId);
  // No next charge if cancellation scheduled or paused.
  if (mock.status !== "active") return null;
  const d = new Date();
  if (period === "annual") d.setFullYear(d.getFullYear() + 1);
  else if (period === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  // Simulate ~14 days away for monthly, ~30 for quarterly, ~60 for annual so
  // the UI shows a realistic "next charge in N days".
  const daysAway = period === "annual" ? 60 : period === "quarterly" ? 30 : 14;
  d.setTime(Date.now() + daysAway * 24 * 60 * 60 * 1000);
  const amountUsd =
    period === "annual" ? ANNUAL_USD : period === "quarterly" ? QUARTERLY_USD : MONTHLY_USD;
  return { date: d.toISOString(), amountUsd };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
