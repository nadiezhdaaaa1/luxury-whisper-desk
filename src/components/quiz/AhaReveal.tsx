import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { track } from "@/lib/analytics";
import { indicativeValue, type QuizAnswers } from "@/lib/quiz";

type Props = {
  answers: QuizAnswers;
  email: string;
};

export function AhaReveal({ answers, email }: Props) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    track("aha_reveal", { brands: answers.brands.length });
  }, [answers.brands.length]);

  const value = indicativeValue(answers.brands);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

  async function googleSignup() {
    setError(null);
    setBusy("google");
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      setBusy(null);
      setError("Google sign-in failed. Try again or use email.");
      return;
    }
    if (res.redirected) return;
    // session set; wait for onAuthStateChange to route via /app handoff.
    track("account_created", { method: "google" });
    window.location.href = "/app";
  }

  async function emailMagicLink() {
    setError(null);
    setBusy("email");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/app" },
    });
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-hairline">
        <div className="mx-auto w-full max-w-2xl px-5 py-4 text-center">
          <span
            className="text-sm uppercase tracking-[0.05em] text-primary"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="font-semibold">LUX</span>
            <span className="font-normal">TRACKER</span>
          </span>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
        <div className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Your preview
        </div>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-medium tracking-tight">
          Here's what your dashboard will track
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Based on your picks. Create your account to save it.
        </p>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Indicative collection value
            </div>
            <div className="mt-1 font-display text-3xl">{formatted}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Estimate based on typical entry prices — not investment advice.
            </p>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Watchlist ({answers.brands.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {answers.brands.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <MiniCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Signals"
              value="12 this week"
            />
            <MiniCard
              icon={<Bell className="h-4 w-4" />}
              label="Drop alerts"
              value="On"
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-hairline bg-surface p-5">
          <div className="font-display text-base font-medium">
            Create your account to save this
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            We'll send your report to <span className="font-medium text-foreground">{email}</span>.
          </p>

          <div className="mt-4 space-y-2">
            <button
              onClick={googleSignup}
              disabled={busy !== null}
              className="w-full rounded-full border border-hairline bg-background hover:bg-surface-2 h-11 text-sm font-display font-medium disabled:opacity-60"
            >
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
            {sent ? (
              <div className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                Check your inbox — we sent a magic link to {email}.
              </div>
            ) : (
              <button
                onClick={emailMagicLink}
                disabled={busy !== null}
                className="btn-primary w-full disabled:opacity-60"
              >
                {busy === "email" ? "Sending…" : "Email me a magic link"}
              </button>
            )}
          </div>

          {error ? (
            <p className="mt-3 text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-lg">{value}</div>
    </div>
  );
}
