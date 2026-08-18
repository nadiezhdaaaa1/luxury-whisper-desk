import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { PLAN_DEFS, splitPortfolioByPlan } from "@/lib/subscription";
import { FREE_ACTIVE_CAP } from "@/lib/watchlist";
import {
  CANCEL_REASONS,
  type CancelReason,
  scheduleCancel,
  acceptSaveOffer,
  recordCancelReason,
  currentPeriodEnd,
  formatPeriodEnd,
  formatShortDate,
} from "@/lib/subscription-mock";

type Step = "decide" | "done";

export type CancelPortfolioRow = { id: string; created_at: string };
export type CancelWatchlistRow = { id: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  period: "monthly" | "annual";
  /** Real portfolio rows — used to compute what becomes read-only on Free. */
  portfolio: CancelPortfolioRow[];
  /** Real watchlist rows — used to compute what pauses on Free. */
  watchlist: CancelWatchlistRow[];
  onCancelled: () => void;
  onSaved: () => void;
};

const DISCOUNT_PCT = 30;

/** "$24.99" -> 24.99 */
function parsePrice(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  userId,
  period,
  portfolio,
  watchlist,
  onCancelled,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>("decide");
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [endsAtIso, setEndsAtIso] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setStep("decide");
      setReason(null);
      setNote("");
      setBusy(false);
      setFailed(false);
      setEndsAtIso(currentPeriodEnd(userId, period));
      track("cancel_flow_opened", { period });
    }
  }, [open, period, userId]);

  const endsAtLong = formatPeriodEnd(endsAtIso);
  const endsAtShort = formatShortDate(endsAtIso);

  // Same split settings.tsx uses for its usage pills — evaluated against the
  // Free plan, since that's what the account moves to.
  const portfolioTotal = portfolio.length;
  const portfolioReadOnly = useMemo(
    () => splitPortfolioByPlan(portfolio, "free").paused.length,
    [portfolio],
  );
  const watchlistTotal = watchlist.length;
  const watchlistPaused = Math.max(0, watchlistTotal - FREE_ACTIVE_CAP);

  // Discounted monthly price derived from the real plan price.
  const planDef = PLAN_DEFS.find((p) =>
    period === "annual" ? p.id === "pro_annual" : p.id === "pro_monthly",
  );
  const monthlyPrice =
    period === "annual" ? parsePrice(planDef?.price ?? "0") / 12 : parsePrice(planDef?.price ?? "0");
  const discounted = formatUsd(monthlyPrice * (1 - DISCOUNT_PCT / 100));

  function handleAcceptOffer() {
    setBusy(true);
    try {
      acceptSaveOffer(userId, DISCOUNT_PCT);
      track("cancel_flow_offer_accepted", { discount: DISCOUNT_PCT });
      toast.success(`${DISCOUNT_PCT}% off applied for the next 3 months`, {
        description: "Thanks for staying — your Pro plan continues uninterrupted.",
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setBusy(true);
    setFailed(false);
    try {
      const state = scheduleCancel(userId, period);
      setEndsAtIso(state.endsAt);
      track("subscription_cancel_scheduled", { period });
      void import("@/lib/notifications-mock").then((m) => {
        m.sendMockEmail({
          template: "subscription_canceled",
          channel: "plan_updates",
          to: "you@example.com",
          data: { endsAt: state.endsAt },
        });
      });
      setStep("done");
      track("cancel_flow_step", { step: "done" });
    } catch (e) {
      console.error("[cancel] failed", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    onCancelled();
    onOpenChange(false);
  }

  function handleSendReason() {
    if (reason) {
      recordCancelReason(userId, reason, note.trim() || undefined);
      track("cancel_reason_submitted", { reason, period });
    }
    finish();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {step === "decide" && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel your Pro plan</DialogTitle>
              <DialogDescription>
                You'll keep Pro until{" "}
                <span className="font-semibold text-foreground">{endsAtLong}</span>. After that your
                account moves to Free — nothing is deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-1 rounded-2xl border border-hairline bg-surface p-4">
              <div className="font-display text-sm font-semibold text-foreground">
                What changes on {endsAtShort}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/90">
                    Your {portfolioTotal} portfolio pieces stay — {portfolioReadOnly} become
                    read-only
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/90">
                    Your {watchlistTotal} watchlist brands stay — {watchlistPaused} pause
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/90">Price-rise and drop alerts stop</span>
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Come back anytime and everything unlocks exactly as you left it.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                You keep access through the period you've paid for — see our{" "}
                <a href="/refunds" className="underline underline-offset-4 hover:text-foreground">
                  refund policy
                </a>
                .
              </p>
            </div>

            <div className="mt-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Other options
              </div>
              <button
                onClick={handleAcceptOffer}
                disabled={busy}
                className="mt-2 min-h-[44px] w-full rounded-2xl border border-hairline bg-surface p-4 text-left transition hover:bg-surface-2"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-display text-sm font-semibold text-foreground">
                      {DISCOUNT_PCT}% off for 3 months
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Keep every Pro feature at {discounted}/month. Applied automatically to your
                      next three charges.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {failed && (
              <div className="mt-1 flex items-start gap-2.5 rounded-2xl border border-alert/30 bg-alert/5 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
                <span className="text-foreground/90">
                  Couldn't cancel just now. Nothing changed and you haven't been charged. Try again,
                  or email{" "}
                  <a
                    href="mailto:billing@price.you"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    billing@price.you
                  </a>{" "}
                  and we'll take care of it.
                </span>
              </div>
            )}

            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Keep Pro
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={busy}
              >
                {busy ? "Cancelling…" : "Cancel subscription"}
              </Button>

            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Sorry to see you go</DialogTitle>
              <DialogDescription>
                Your Pro plan runs until{" "}
                <span className="font-semibold text-foreground">{endsAtLong}</span>. Nothing's been
                deleted — restart anytime from Settings.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-1">
              <p className="text-sm text-foreground/90">
                If you have ten seconds — what tipped the decision?
              </p>
              <RadioGroup
                value={reason ?? ""}
                onValueChange={(v) => setReason(v as CancelReason)}
                className="mt-3 space-y-2"
              >
                {CANCEL_REASONS.map((r) => (
                  <Label
                    key={r.id}
                    htmlFor={`reason-${r.id}`}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-sm hover:bg-surface-2"
                  >
                    <RadioGroupItem id={`reason-${r.id}`} value={r.id} />
                    <span className="text-foreground">{r.label}</span>
                  </Label>
                ))}
              </RadioGroup>
              {reason === "other" && (
                <Textarea
                  placeholder="Tell us more (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={280}
                  className="mt-2"
                />
              )}
            </div>

            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button variant="ghost" onClick={finish} className="min-h-[44px] rounded-full">
                Skip
              </Button>
              <Button onClick={handleSendReason} className="min-h-[44px] rounded-full">
                Send
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
