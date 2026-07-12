import { useEffect, useState } from "react";
import { AlertTriangle, Check, PauseCircle, Sparkles } from "lucide-react";
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
import {
  CANCEL_REASONS,
  type CancelReason,
  scheduleCancel,
  acceptSaveOffer,
  pauseSubscription,
  formatEndDate,
  daysUntil,
} from "@/lib/subscription-mock";

type Step = "losses" | "reason" | "offer" | "confirm" | "done";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  period: "monthly" | "annual";
  onCancelled: () => void;
  onSaved: () => void;
  onPaused: () => void;
};

const LOSSES = [
  "Unlimited portfolio and watchlist items",
  "Every signal — price rises, drops, and new collections",
  "Portfolio dashboard with performance breakdown",
  "Advanced notifications and quiet hours",
  "Priority support",
];

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  userId,
  period,
  onCancelled,
  onSaved,
  onPaused,
}: Props) {
  const [step, setStep] = useState<Step>("losses");
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [endsAtIso, setEndsAtIso] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setStep("losses");
      setReason(null);
      setNote("");
      setBusy(false);
      setEndsAtIso(undefined);
      track("cancel_flow_opened", { period });
    }
  }, [open, period]);

  function goto(next: Step) {
    setStep(next);
    track("cancel_flow_step", { step: next });
  }

  function handleAcceptOffer() {
    setBusy(true);
    try {
      acceptSaveOffer(userId, 30);
      track("cancel_flow_offer_accepted", { discount: 30 });
      toast.success("30% off applied for the next 3 months", {
        description: "Thanks for staying — your Pro plan continues uninterrupted.",
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function handlePause(months: 1 | 3) {
    setBusy(true);
    try {
      pauseSubscription(userId, months);
      track("cancel_flow_paused", { months });
      toast.success(`Paused for ${months} month${months > 1 ? "s" : ""}`, {
        description: "We'll resume your Pro plan automatically. No charges while paused.",
      });
      onPaused();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmCancel() {
    if (!reason) return;
    setBusy(true);
    try {
      const state = scheduleCancel(userId, period, reason, note.trim() || undefined);
      setEndsAtIso(state.endsAt);
      track("subscription_cancel_scheduled", { reason, period });
      // Fire mock confirmation email
      void import("@/lib/notifications-mock").then((m) => {
        m.sendMockEmail({
          template: "subscription_canceled",
          channel: "plan_updates",
          to: "you@example.com",
          data: { endsAt: state.endsAt, reason },
        });
      });
      goto("done");
    } finally {
      setBusy(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {step === "losses" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-alert/10">
                <AlertTriangle className="h-6 w-6 text-alert" />
              </div>
              <DialogTitle className="text-center">Here's what you'll lose</DialogTitle>
              <DialogDescription className="text-center">
                Cancel now and your Pro benefits end on your next billing date. Nothing gets deleted — your data stays.
              </DialogDescription>
            </DialogHeader>
            <ul className="mt-2 space-y-2.5">
              {LOSSES.map((l) => (
                <li key={l} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/90">{l}</span>
                </li>
              ))}
            </ul>
            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
                Keep Pro
              </Button>
              <Button
                variant="outline"
                onClick={() => goto("reason")}
                className="rounded-full border-alert/40 text-alert hover:bg-alert/5 hover:text-alert"
              >
                Continue cancellation
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "reason" && (
          <>
            <DialogHeader>
              <DialogTitle>Quick question — why are you leaving?</DialogTitle>
              <DialogDescription>
                Your answer helps us fix the biggest gaps first. Takes 10 seconds.
              </DialogDescription>
            </DialogHeader>
            <RadioGroup
              value={reason ?? ""}
              onValueChange={(v) => setReason(v as CancelReason)}
              className="mt-2 space-y-2"
            >
              {CANCEL_REASONS.map((r) => (
                <Label
                  key={r.id}
                  htmlFor={`reason-${r.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-sm hover:bg-surface-2"
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
                className="mt-1"
              />
            )}
            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => goto("losses")} className="rounded-full">
                Back
              </Button>
              <Button
                onClick={() => goto("offer")}
                disabled={!reason}
                className="rounded-full"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "offer" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">
                {reason === "too_expensive"
                  ? "Before you go — 30% off for 3 months?"
                  : reason === "temporary_break"
                  ? "Take a break instead?"
                  : "Would this change your mind?"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {reason === "temporary_break"
                  ? "Pause your subscription and pick up right where you left off."
                  : "Keep every Pro feature at a reduced rate — or pause instead."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-3">
              <button
                onClick={handleAcceptOffer}
                disabled={busy}
                className="group w-full rounded-2xl border-2 border-primary bg-primary/5 p-4 text-left transition hover:bg-primary/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-base font-semibold text-primary">
                      Save 30% for 3 months
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Keep every Pro feature. Applied to your next charge automatically.
                    </div>
                  </div>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-display font-semibold uppercase tracking-widest text-primary-foreground">
                    Best
                  </span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePause(1)}
                  disabled={busy}
                  className="rounded-2xl border border-hairline bg-surface p-3 text-left transition hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-display text-sm font-semibold">Pause 1 month</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Auto-resumes</div>
                </button>
                <button
                  onClick={() => handlePause(3)}
                  disabled={busy}
                  className="rounded-2xl border border-hairline bg-surface p-3 text-left transition hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-display text-sm font-semibold">Pause 3 months</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Auto-resumes</div>
                </button>
              </div>
            </div>

            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => goto("reason")} className="rounded-full">
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => goto("confirm")}
                disabled={busy}
                className="rounded-full border-alert/40 text-alert hover:bg-alert/5 hover:text-alert"
              >
                No thanks, cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm cancellation</DialogTitle>
              <DialogDescription>
                Your Pro plan will stay active until the end of your current billing period.
                After that you'll switch to Free — nothing gets deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 rounded-2xl border border-hairline bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-display font-semibold">
                  Pro {period === "annual" ? "Annual" : "Monthly"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Access ends</span>
                <span className="font-display font-semibold text-alert">
                  ~{period === "annual" ? "60" : "14"} days
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Refund</span>
                <span className="text-foreground">Not applicable — use through end of period</span>
              </div>
            </div>
            <DialogFooter className="mt-2 gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => goto("offer")} disabled={busy} className="rounded-full">
                Back
              </Button>
              <Button
                onClick={handleConfirmCancel}
                disabled={busy}
                className="rounded-full bg-alert text-white hover:bg-alert/90"
              >
                {busy ? "Cancelling…" : "Cancel subscription"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-positive/10">
                <Check className="h-6 w-6 text-positive" />
              </div>
              <DialogTitle className="text-center">Cancellation scheduled</DialogTitle>
              <DialogDescription className="text-center">
                Your Pro plan stays active until{" "}
                <span className="font-semibold text-foreground">
                  {formatEndDate(endsAtIso)}
                </span>{" "}
                ({daysUntil(endsAtIso)} days). Change your mind anytime before then to keep Pro.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 justify-center">
              <Button
                onClick={() => {
                  onCancelled();
                  onOpenChange(false);
                }}
                className="rounded-full"
              >
                Got it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
