import { CreditCard, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  formatInvoiceDate,
  formatUsd,
  getMockInvoices,
  getNextCharge,
  MOCK_PAYMENT_METHOD,
} from "@/lib/billing-mock";

type Props = {
  userId: string | undefined;
  plan: "free" | "pro" | undefined;
  period: "monthly" | "annual" | null | undefined;
};

function brandLabel(b: "visa" | "mastercard" | "amex"): string {
  return b === "visa" ? "Visa" : b === "mastercard" ? "Mastercard" : "Amex";
}

export function BillingCard({ userId, plan, period }: Props) {
  if (plan !== "pro") return null;

  const invoices = getMockInvoices(userId, plan, period);
  const next = getNextCharge(userId, plan, period);
  const pm = MOCK_PAYMENT_METHOD;

  function handleUpdateCard() {
    track("payment_method_update_clicked", {});
    toast.info("Payment method update", {
      description: "This opens the secure card update sheet once billing is live.",
    });
  }

  function handleDownload(inv: { id: string; date: string; amountUsd: number; period: "monthly" | "annual" }) {
    track("invoice_download_clicked", { invoice_id: inv.id });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${inv.id}</title>
<style>body{font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:640px;margin:48px auto;padding:0 24px;color:#111}
h1{font-size:20px;margin:0 0 4px}.muted{color:#666;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:12px 0;border-bottom:1px solid #eee;font-size:14px}
.total{font-weight:600;font-size:16px}.badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#e7f8ee;color:#0a7a3b;font-size:11px}
</style></head><body>
<div class="muted">Receipt</div><h1>Payment receipt</h1>
<div class="muted" style="margin-top:16px">Invoice</div><div>${inv.id}</div>
<div class="muted" style="margin-top:12px">Date</div><div>${formatInvoiceDate(inv.date)}</div>
<div class="muted" style="margin-top:12px">Status</div><div><span class="badge">Paid</span></div>
<table><tr><td>Pro plan — ${inv.period === "annual" ? "Annual" : "Monthly"} subscription</td><td style="text-align:right">${formatUsd(inv.amountUsd)}</td></tr>
<tr><td class="total">Total</td><td class="total" style="text-align:right">${formatUsd(inv.amountUsd)} USD</td></tr></table>
<p class="muted" style="margin-top:32px">Preview receipt. Official tax invoices are issued by our billing provider once live payments are enabled.</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${inv.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }

  return (
    <section>
      <h2 className="font-display text-base font-medium mb-3 text-foreground">
        Billing & payments
      </h2>
      <div className="rounded-2xl border border-hairline bg-surface p-6 space-y-6">
        {/* Payment method */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-14 place-items-center rounded-md border border-hairline bg-white text-xs font-display font-bold uppercase tracking-widest text-foreground">
              {brandLabel(pm.brand)}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Payment method
              </div>
              <div className="mt-0.5 font-display text-sm font-semibold">
                {brandLabel(pm.brand)} ending in {pm.last4}
              </div>
              <div className="text-xs text-muted-foreground">
                Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateCard}
            className="rounded-full"
          >
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Update card
          </Button>
        </div>

        {/* Next charge */}
        {next && (
          <div className="rounded-xl border border-hairline bg-white p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Next charge
                </div>
                <div className="mt-1 font-display text-lg font-semibold">
                  {formatUsd(next.amountUsd)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    on {formatInvoiceDate(next.date)}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Billed {period === "annual" ? "yearly" : "monthly"} · USD
              </span>
            </div>
          </div>
        )}

        {/* Invoice history */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Payment history
            </span>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments yet. Your first receipt will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-white">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-display font-semibold">
                      {formatUsd(inv.amountUsd)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatInvoiceDate(inv.date)} ·{" "}
                      {inv.period === "annual" ? "Annual" : "Monthly"} · Paid
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(inv)}
                    className="inline-flex items-center gap-1 text-xs font-display font-semibold text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Receipt
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
