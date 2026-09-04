// Registration pop-up. One dialog, both directions: an existing email must not
// error — sending a code signs the user in either way.
//
// No password field lives here on purpose. Passwords remain on /signup,
// /login, /app/settings and /onboarding/credentials.
import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import googleIcon from "@/assets/google-icon.svg.asset.json";
import { useOtpAuth, type AuthMethod } from "@/lib/auth/authActions";
import { track } from "@/lib/analytics";

const emailSchema = z.string().trim().email("Enter a valid email address");

export type RegistrationSource = "landing_card" | "funnel_param" | "aha_in_app" | "checkout";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where Google should send the browser back to (public route). */
  googleRedirectTo: string;
  /** Called after a successful auth — the opener decides where to navigate. */
  onAuthed: (method: AuthMethod) => void | Promise<void>;
  source: RegistrationSource;
  plan?: string | null;
  title?: string;
  subtitle?: string;
};

export function RegistrationModal({
  open,
  onOpenChange,
  googleRedirectTo,
  onAuthed,
  source,
  plan = null,
  title = "Create your account",
  subtitle = "Your account is created first, then you pay. No password needed.",
}: Props) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const otp = useOtpAuth({ onAuthed, variant: "modal" });

  useEffect(() => {
    if (open) track("registration_modal_opened", { source, plan });
  }, [open, source, plan]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Closing keeps the saved plan intent — the opener decides what next.
      setEmailError(null);
      otp.reset();
      setConfirmedEmail("");
    }
    onOpenChange(next);
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setEmailError(null);
    setConfirmedEmail(parsed.data);
    const ok = await otp.sendCode(parsed.data);
    if (!ok) setConfirmedEmail("");
  }

  const busy = otp.busy !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-hairline">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">{title}</DialogTitle>
          <DialogDescription className="sr-only">{subtitle}</DialogDescription>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">{subtitle}</p>

        {!otp.codeSent ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void otp.googleSignIn(googleRedirectTo)}
              disabled={busy}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <img src={googleIcon.url} alt="" aria-hidden className="h-4 w-4" />
              {otp.busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-hairline" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <form onSubmit={submitEmail} className="space-y-2" noValidate>
              <label
                htmlFor="reg-modal-email"
                className="block text-xs uppercase tracking-wide text-muted-foreground"
              >
                Email
              </label>
              <Input
                id="reg-modal-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!emailError}
              />
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
              <button type="submit" disabled={busy} className="btn-secondary w-full disabled:opacity-60">
                {otp.busy === "send" ? "Sending code…" : "Email me a 6-digit code"}
              </button>
            </form>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void otp.verifyCode(confirmedEmail);
            }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{confirmedEmail}</span>. Enter it below
              to continue.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp.code}
              onChange={(e) => otp.setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-hairline bg-background px-4 py-3 text-center text-lg tracking-[0.5em] font-display focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="6-digit verification code"
            />
            <button
              type="submit"
              disabled={busy || otp.code.length !== 6}
              className="btn-primary w-full disabled:opacity-60"
            >
              {otp.busy === "verify" ? "Verifying…" : "Verify & continue"}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => void otp.sendCode(confirmedEmail)}
                disabled={busy || otp.cooldown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {otp.cooldown > 0 ? `Resend in ${otp.cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  otp.reset();
                  setConfirmedEmail("");
                }}
                className="text-muted-foreground hover:underline"
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {otp.error ? <p className="text-xs text-destructive">{otp.error}</p> : null}

        <p className="text-[11px] text-muted-foreground text-center">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
