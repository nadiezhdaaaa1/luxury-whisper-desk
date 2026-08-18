import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { requestAccountDeletion } from "@/lib/account-deletion.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onScheduled: () => void;
};

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountDialog({ open, onOpenChange, email, onScheduled }: Props) {
  const [phrase, setPhrase] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canConfirm = phrase.trim().toUpperCase() === CONFIRM_PHRASE;
  const submit = useServerFn(requestAccountDeletion);

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      const request = await submit({ data: { reason: reason.trim() || undefined } });
      track("account_deletion_scheduled", {});
      toast.success("Account deletion scheduled", {
        description: "You have 30 days to change your mind.",
      });
      void import("@/lib/notifications-mock").then((m) => {
        m.sendMockEmail({
          template: "account_deletion_scheduled",
          channel: "security_alerts",
          to: email,
          data: { deleteAt: request.delete_after },
        });
      });
      setPhrase("");
      setReason("");
      onScheduled();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't schedule deletion", { description: "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-alert/10">
            <AlertTriangle className="h-6 w-6 text-alert" />
          </div>
          <DialogTitle className="text-center">Delete your account?</DialogTitle>
          <DialogDescription className="text-center">
            This starts a 30-day grace period. During that time you can sign in and cancel the
            deletion. After 30 days, everything for{" "}
            <span className="font-semibold text-foreground">{email}</span> is permanently removed —
            portfolio, brand watchlist, price alerts, and account. We keep a minimal record that the
            request was made and honoured — your user ID and the dates, with no personal details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Why are you leaving? (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={280}
              placeholder="Your feedback helps us fix the biggest gaps"
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phrase">
              Type <span className="font-mono font-semibold text-alert">{CONFIRM_PHRASE}</span> to
              confirm
            </Label>
            <Input
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy || !canConfirm}>
            {busy ? "Scheduling…" : "Delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
