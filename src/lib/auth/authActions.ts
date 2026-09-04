// Shared OTP + Google auth actions.
//
// Extracted verbatim from the inline logic that used to live in
// `AhaRevealV3` so the registration modal and the A-ha screen can never drift.
// Passwords are deliberately NOT here — they remain in /signup, /login,
// /app/settings and /onboarding/credentials.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { track } from "@/lib/analytics";
import { clearPostAuthPath } from "@/lib/onboarding/planIntent";

export const RESEND_COOLDOWN_SECONDS = 30;

export type AuthMethod = "google" | "email_otp";
export type AuthBusy = "google" | "send" | "verify" | null;

export function friendlyOtpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("expired")) return "That code has expired. Send a new one.";
  if (m.includes("invalid") || m.includes("token")) return "That code isn't right. Try again.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts. Wait a moment and try again.";
  return "Something went wrong. Try again.";
}

export async function sendOtpCode(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // An existing email must sign in rather than error — same door either way.
    options: { shouldCreateUser: true },
  });
  return { error: error ? friendlyOtpError(error.message) : null };
}

export async function verifyOtpCode(
  email: string,
  token: string,
): Promise<{ error: string | null; rawMessage?: string }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: friendlyOtpError(error.message), rawMessage: error.message };
  return { error: null };
}

export async function startGoogleAuth(
  redirectTo: string,
): Promise<{ error: string | null; redirected: boolean }> {
  const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
  if (res.error) return { error: "Google sign-in failed. Try again or use email.", redirected: false };
  return { error: null, redirected: !!res.redirected };
}

type Options = {
  /** Runs after a successful authentication (either method). */
  onAuthed: (method: AuthMethod) => void | Promise<void>;
  /** Analytics variant tag, kept so existing events don't change shape. */
  variant?: string;
};

/**
 * The whole OTP state machine: send, verify, 30s resend cooldown, change
 * email and error text. Owned here so both consumers behave identically.
 */
export function useOtpAuth({ onAuthed, variant = "v3" }: Options) {
  const [busy, setBusy] = useState<AuthBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const reset = useCallback(() => {
    setCodeSent(false);
    setCode("");
    setError(null);
  }, []);

  const sendCode = useCallback(
    async (email: string) => {
      setError(null);
      setBusy("send");
      const { error: err } = await sendOtpCode(email);
      setBusy(null);
      if (err) {
        clearPostAuthPath();
        setError(err);
        return false;
      }
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      track("otp_code_sent", { variant });
      return true;
    },
    [variant],
  );

  const verifyCode = useCallback(
    async (email: string) => {
      if (code.length !== 6 || busy) return false;
      setError(null);
      setBusy("verify");
      const { error: err, rawMessage } = await verifyOtpCode(email, code);
      if (err) {
        setBusy(null);
        clearPostAuthPath();
        track("otp_verify_failed", { message: rawMessage, variant });
        setError(err);
        return false;
      }
      track("otp_verified", { variant });
      track("account_created", { method: "email_otp", variant });
      track("auth_succeeded", { method: "email_otp" });
      await onAuthed("email_otp");
      setBusy(null);
      return true;
    },
    [busy, code, onAuthed, variant],
  );

  const googleSignIn = useCallback(
    async (redirectTo: string) => {
      setError(null);
      setBusy("google");
      const res = await startGoogleAuth(redirectTo);
      if (res.error) {
        setBusy(null);
        clearPostAuthPath();
        setError(res.error);
        return false;
      }
      // The browser is navigating away; the return trip finishes the flow.
      if (res.redirected) return true;
      track("account_created", { method: "google", variant });
      track("auth_succeeded", { method: "google" });
      await onAuthed("google");
      setBusy(null);
      return true;
    },
    [onAuthed, variant],
  );

  return {
    busy,
    error,
    setError,
    codeSent,
    code,
    setCode,
    cooldown,
    reset,
    sendCode,
    verifyCode,
    googleSignIn,
  };
}
