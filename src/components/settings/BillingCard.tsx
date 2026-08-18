import { Info } from "lucide-react";

type Props = {
  userId: string | undefined;
  plan: "free" | "pro" | undefined;
  period: "monthly" | "annual" | null | undefined;
};

/**
 * Billing summary. Payments are not live yet, so we intentionally do NOT show
 * a fake saved card, invoice history, or next-charge date — those would
 * misrepresent the account state to users and to payment-provider review.
 * Once real billing is wired up, this card renders the payment method,
 * next charge, and invoice list.
 */
export function BillingCard({ plan, period }: Props) {
  if (plan !== "pro") return null;

  return (
    <section>
      <h2 className="font-display text-base font-medium mb-3 text-foreground">
        Billing & payments
      </h2>
      <div className="rounded-2xl border border-hairline bg-surface p-6">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Current plan
            </div>
            <div className="font-display text-sm font-semibold text-foreground">
              Pro · {period === "annual" ? "Annual" : "Monthly"}
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Payments are being set up. Your saved card, upcoming charge, and receipts will appear
              here as soon as checkout goes live.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
