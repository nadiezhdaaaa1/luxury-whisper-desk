import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function TwoFactorChallenge({ onVerified }: { onVerified: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) { setError(error.message); return; }
      const factor = data.totp.find((f) => f.status === "verified");
      if (!factor) { setError("No verified authenticator found."); return; }
      setFactorId(factor.id);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (chErr) { setError(chErr.message); return; }
      setChallengeId(ch.id);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setLoading(true); setError(null);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onVerified();
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code from your authenticator app.
      </p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error ? <p className="text-xs text-destructive text-center">{error}</p> : null}
      <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
        {loading ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}
