import { useEffect, useState } from "react";
import { ChevronLeft, TrendingUp, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { track } from "@/lib/analytics";
import { indicativeValue, type QuizAnswers } from "@/lib/quiz";

type Props = {
  answers: QuizAnswers;
  email: string;
  onBack?: () => void;
};

const TOTAL_STEPS = 3;

export function AhaReveal({ answers, email, onBack }: Props) {
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
      {/* Header + progress matching the quiz screens */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-2">
          <div className="flex items-center justify-center">
            <span
              className="text-[1.35rem] leading-none uppercase tracking-[0.05em] text-primary"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <span className="font-semibold">LUX</span>
              <span className="font-normal">TRACKER</span>
            </span>
          </div>
          <div className="mt-5 flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full bg-primary transition-colors duration-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-2 pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-3 sm:px-4">
          <div>
            <span className="eyebrow">Your preview</span>
            <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
              Here's what your dashboard will track
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Based on your picks. Create your account to save it.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:gap-4">
            <div className="card-soft p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Indicative collection value
              </div>
              <div className="mt-1 font-display text-3xl">{formatted}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Estimate based on typical entry prices — not investment advice.
              </p>
            </div>

            <div className="card-soft p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Watchlist ({answers.brands.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {answers.brands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center rounded-full bg-surface-2 border border-hairline px-3 py-1 text-xs"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="mt-8 card-soft p-5">
            <div className="font-display text-base font-medium">
              Create your account to save this
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              We'll send your report to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={googleSignup}
                disabled={busy !== null}
                className="btn-ghost w-full disabled:opacity-60"
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

          <div className="mt-10 flex items-center justify-between gap-3">
            <Link to="/" className="text-primary font-medium hover:underline px-2">
              Back to site
            </Link>

            {onBack ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="btn-ghost inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              </div>
            ) : null}
          </div>
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
