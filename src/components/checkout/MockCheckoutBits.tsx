// Shared, card-free UI for the mock checkout pages. No inputs live here by
// design — the payment method is static display text only.
import { MOCK_PAYMENT_METHOD } from "@/lib/billing-mock";

export function TestModeBanner() {
  return (
    <div className="rounded-2xl border border-primary-muted/50 bg-primary-muted/10 px-4 py-3">
      <p className="text-sm font-medium text-foreground">TEST MODE — no payment is taken</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This is a mock checkout standing in for our payment provider. No card details are collected
        anywhere on this page and nothing is charged.
      </p>
    </div>
  );
}

export function StaticPaymentMethod() {
  const pm = MOCK_PAYMENT_METHOD;
  return (
    <div className="rounded-2xl border border-hairline bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment method</p>
      <p className="mt-1 text-sm text-foreground">
        Visa •{pm.last4} — expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Placeholder test card shown for display only — it cannot be edited and is never charged.
      </p>
    </div>
  );
}
