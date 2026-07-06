import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type EnrollState =
  | { step: "idle" }
  | { step: "enrolling" }
  | { step: "verify"; factorId: string; qr: string; secret: string }
  | { step: "done" };

export function TwoFactorEnroll() {
  const [state, setState] = useState<EnrollState>({ step: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setError(null); setBusy(true);
    // Clean up prior unverified factors
    const list = await supabase.auth.mfa.listFactors();
    if (list.data) {
      for (const f of list.data.totp) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setState({
      step: "verify",
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (state.step !== "verify") return;
    setError(null); setBusy(true);
    const ch = await supabase.auth.mfa.challenge({ factorId: state.factorId });
    if (ch.error) { setError(ch.error.message); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: state.factorId,
      challengeId: ch.data.id,
      code,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setState({ step: "done" });
    setCode("");
  }

  if (state.step === "idle") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add an extra layer with an authenticator app (Google Authenticator, 1Password, Authy…).
        </p>
        <Button onClick={start} disabled={busy}>
          {busy ? "Preparing…" : "Enable two-factor"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (state.step === "verify") {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code, then enter the 6-digit code your app shows.
        </p>
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-lg border border-hairline">
            <img src={state.qr} alt="Two-factor QR code" className="w-40 h-40" />
          </div>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Can't scan? Show secret</summary>
          <code className="mt-1 block break-all rounded bg-surface-2 p-2">{state.secret}</code>
        </details>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error ? <p className="text-xs text-destructive text-center">{error}</p> : null}
        <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
          {busy ? "Verifying…" : "Verify & enable"}
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-md bg-surface-2 border border-hairline p-4">
      <p className="text-sm text-foreground font-medium">Two-factor is on.</p>
      <p className="text-xs text-muted-foreground mt-1">
        You'll be asked for a 6-digit code the next time you sign in.
      </p>
    </div>
  );
}
