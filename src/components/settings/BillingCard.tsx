import { Info } from "lucide-react";

import { isDevBuild } from "@/lib/dev-only";
import {
  MOCK_PAYMENT_METHOD,
  getMockInvoices,
  formatInvoiceDate,
  formatUsd,
} from "@/lib/billing-mock";
import { formatEndDate } from "@/lib/subscription-mock";

type Props = {
  userId: string | undefined;
  plan: "free" | "pro" | undefined;
  period: "monthly" | "quarterly" | "annual" | null | undefined;
  trialEndsAt?: string | null;
};

/**
 * Billing summary — payment method and payment history.
 *
 * Rule: the two mock reads below (MOCK_PAYMENT_METHOD, getMockInvoices) are the
 * only place billing data enters this component, and real billing replaces
 * exactly those with a server function that reads the payment provider.
 *
 * The mock is rendered ONLY in a development build, gated by the fail-closed
 * isDevBuild() helper. Showing a fabricated saved card or receipts in a
 * production build would misrepresent the account state to users and to
 * payment-provider review, so production keeps the honest "payments are being
 * set up" message instead.
 */
export function BillingCard({ userId, plan, period, trialEndsAt }: Props) {
  if (plan !== "pro") return null;

  const dev = isDevBuild();

  return (
    <section>
      <h2 className="font-display text-base font-medium mb-3 text-foreground">
        Billing & payments
      </h2>
      <div className="rounded-2xl border border-hairline bg-surface p-6">
        {dev ? <DevBillingContent userId={userId} plan={plan} period={period} trialEndsAt={trialEndsAt} /> : <PendingBilling />}
      </div>
    </section>
  );
}

function PendingBilling() {
  return (
    <div className="flex items-start gap-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground max-w-md">
        Payments are being set up. Your saved card, upcoming charge, and receipts will appear here
        as soon as checkout goes live.
      </p>
    </div>
  );
}

function DevBillingContent({ userId, plan, period, trialEndsAt }: Props) {
  // ---- Mock swap seam ----------------------------------------------------
  // These two reads are the only place billing data enters this component.
  // Real billing replaces exactly these with a server function that reads the
  // payment provider.
  const pm = MOCK_PAYMENT_METHOD;
  const invoices = getMockInvoices(userId, plan, period);
  // ------------------------------------------------------------------------

  const trialing = !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
  const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));

  const brand = pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1);
  const exp = `${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Test data — no real card is stored and no charges have been made.
      </p>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Payment method
        </div>
        <div className="mt-1 font-display text-sm font-semibold text-foreground">
          {brand} •••• {pm.last4}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">Expires {exp}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Card updates will be handled by the payment provider once checkout is live.
        </p>
      </div>

      <div className="h-px w-full bg-hairline" />

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Payment history
        </div>

        {trialing ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No payments yet — your first charge is on {formatEndDate(trialEndsAt)}.
          </p>
        ) : sorted.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="mt-2">
            {sorted.map((inv, i) => (
              <li
                key={inv.id}
                className={`flex items-center justify-between gap-4 py-3 ${
                  i > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground">{formatInvoiceDate(inv.date)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {inv.period === "annual"
                      ? "Annual"
                      : inv.period === "quarterly"
                        ? "Quarterly"
                        : "Monthly"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      inv.status === "refunded"
                        ? "border-hairline text-muted-foreground"
                        : "border-positive/30 text-positive"
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="font-display text-sm font-semibold tabular-nums text-foreground text-right">
                    {formatUsd(inv.amountUsd)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
