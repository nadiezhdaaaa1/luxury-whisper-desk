import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const label = ["Too weak", "Weak", "Fair", "Strong", "Excellent"][s]!;
  return { score: s as 0 | 1 | 2 | 3 | 4, label };
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = scorePassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = current.length > 0 && next.length > 0 && current === next;
  const invalid = current.length === 0 || next.length < 8 || mismatch || sameAsCurrent;

  function resetAndClose(nextOpen: boolean) {
    if (!nextOpen) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setShowCurrent(false);
      setShow(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleSave() {
    if (invalid) return;
    setBusy(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const email = userData.user?.email;
      if (!email) throw new Error("No email on this account.");

      // Verify current password by re-authenticating.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) {
        toast.error("Current password is incorrect");
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      track("password_changed", {});
      toast.success("Password updated", {
        description: "Use it next time you sign in.",
      });
      resetAndClose(false);
    } catch (e) {
      console.error("[password] failed", e);
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Couldn't update password", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password, then choose a new one. Minimum 8 characters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cur">Current password</Label>
            <div className="relative">
              <Input
                id="cur"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                placeholder="Your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="np">New password</Label>
            <div className="relative">
              <Input
                id="np"
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {next.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-hairline overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      strength.score <= 1
                        ? "bg-alert w-1/4"
                        : strength.score === 2
                          ? "bg-amber-500 w-2/4"
                          : strength.score === 3
                            ? "bg-positive w-3/4"
                            : "bg-positive w-full"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs ${strength.score <= 1 ? "text-alert" : "text-muted-foreground"}`}
                >
                  {strength.label}
                </span>
              </div>
            )}
            {sameAsCurrent && (
              <p className="text-xs text-alert">New password must differ from the current one</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp">Confirm new password</Label>
            <Input
              id="cp"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {mismatch && <p className="text-xs text-alert">Passwords don't match</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => resetAndClose(false)}
            disabled={busy}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || invalid} className="rounded-full">
            {busy ? "Saving…" : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
