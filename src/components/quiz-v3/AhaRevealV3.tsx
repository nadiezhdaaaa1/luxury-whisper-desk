// V3 aha reveal + account creation/login — self-contained.
// Full journey handoff for V3 happens here: after auth we call the V3
// server fn to write brands/categories/segments/role/quiz_completed.
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { ChevronLeft, TrendingUp, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { track } from "@/lib/analytics";
import { useBrandsCatalog } from "@/lib/catalog";
import {
  CATEGORY_LABELS_V3,
  clearDraftV3,
  formatCompactUSDV3,
  indicativeRangeV3,
  personalizationLineV3,
  type CategoryV3,
  type QuizAnswersV3,
  type RoleV3,
} from "@/lib/quiz-v3";
import { saveQuizAnswersV3 } from "@/lib/quiz-v3.functions";

type Props = {
  answers: QuizAnswersV3;
  email: string;
  onBack?: () => void;
};

export function AhaRevealV3({ answers, email, onBack }: Props) {
  const [busy, setBusy] = useState<"google" | "send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const brandsCatalog = useBrandsCatalog();

  useEffect(() => {
    track("aha_reveal_v3", { brands: answers.brands.length });
  }, [answers.brands.length]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resolveTier = useMemo(() => {
    const list = brandsCatalog.data ?? [];
    return (name: string, cat: CategoryV3 | null) => {
      const row = list.find(
        (b) => b.name === name && (cat === null || b.category === cat),
      );
      return (row?.tier as "luxury_invest" | "mid_market" | "mass_market") ?? null;
    };
  }, [brandsCatalog.data]);

  const range = useMemo(
    () => indicativeRangeV3(answers.brands, answers.segments, answers.categories, resolveTier),
    [answers.brands, answers.segments, answers.categories, resolveTier],
  );
  const personal = useMemo(
    () => personalizationLineV3(answers.brands, answers.segments, answers.categories),
    [answers.brands, answers.segments, answers.categories],
  );

  // Attempt to persist V3 answers into the profile after auth. Runs once we
  // have a session. If it fails, /app will surface it via its own handoff.
  async function persistAndGoToApp() {
    try {
      await saveQuizAnswersV3({
        data: {
          segments: answers.segments,
          categories: answers.categories,
          brands: answers.brands,
          role: answers.role as RoleV3,
        },
      });
      clearDraftV3();
      track("quiz_v3_completed_saved", { mode: "landing" });
    } catch (e) {
      // Non-fatal: still land in-app; user can retry there.
      console.error("[v3] saveQuizAnswersV3 failed:", e);
    }
    window.location.href = "/app";
  }

  async function googleSignup() {
    setError(null);
    setBusy("google");
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (res.error) {
      setBusy(null);
      setError("Google sign-in failed. Try again or use email.");
      return;
    }
    if (res.redirected) return;
    track("account_created", { method: "google", variant: "v3" });
    await persistAndGoToApp();
  }

  async function sendCode() {
    setError(null);
    setBusy("send");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(null);
    if (err) {
      setError(friendlyOtpError(err.message));
      return;
    }
    setCodeSent(true);
    setCooldown(30);
    track("otp_code_sent", { variant: "v3" });
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setError(null);
    setBusy("verify");
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (err) {
      setBusy(null);
      track("otp_verify_failed", { message: err.message, variant: "v3" });
      setError(friendlyOtpError(err.message));
      return;
    }
    track("otp_verified", { variant: "v3" });
    track("account_created", { method: "email_otp", variant: "v3" });
    await persistAndGoToApp();
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 pt-8">
          <div className="flex items-center justify-start">
            <Logo className="text-[28px]" />
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-3xl pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-4 sm:px-5">
          <div>
            <span className="eyebrow">Your preview · V3</span>
            <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
              Here's what your dashboard will track
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Based on your picks. Create your account to save it.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:gap-4">
            <HeroValueCard range={range} personal={personal} brandsCount={answers.brands.length} />

            <div
              className="card-soft p-6 sm:p-8"
              style={{ backgroundColor: "#FCFAF6", borderColor: "#E8E4DD" }}
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Watchlist ({answers.brands.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {answers.brands.map((b) => {
                  const sep = " — ";
                  const i = b.lastIndexOf(sep);
                  const name = i === -1 ? b : b.slice(0, i);
                  const cat = i === -1 ? null : b.slice(i + sep.length);
                  return (
                    <span
                      key={b}
                      className="inline-flex items-baseline rounded-full bg-surface-2 border border-hairline px-3 py-1 text-xs"
                    >
                      <span>{name}</span>
                      {cat ? (
                        <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {cat}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
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

          <div className="mt-8 card-soft p-6 sm:p-8">
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
                className="btn-primary w-full disabled:opacity-60"
              >
                {busy === "google" ? "Opening Google…" : "Continue with Google"}
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-hairline" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {!codeSent ? (
                <button
                  onClick={sendCode}
                  disabled={busy !== null}
                  className="btn-ghost w-full disabled:opacity-60"
                >
                  {busy === "send" ? "Sending code…" : "Email me a 6-digit code"}
                </button>
              ) : (
                <form onSubmit={verifyCode} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                    Enter it below to finish signing up.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="w-full rounded-xl border border-hairline bg-background px-4 py-3 text-center text-lg tracking-[0.5em] font-display focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="6-digit verification code"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || code.length !== 6}
                    className="btn-primary w-full disabled:opacity-60"
                  >
                    {busy === "verify" ? "Verifying…" : "Verify & continue"}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={busy !== null || cooldown > 0}
                      className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                    {onBack ? (
                      <button
                        type="button"
                        onClick={onBack}
                        className="text-muted-foreground hover:underline"
                      >
                        Change email
                      </button>
                    ) : null}
                  </div>
                </form>
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

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="card-soft p-6 sm:p-8"
      style={{ backgroundColor: "#FCFAF6", borderColor: "#E8E4DD" }}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-lg">{value}</div>
    </div>
  );
}

function useCountUp(target: number, durationMs = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setVal(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

function HeroValueCard({
  range,
  personal,
  brandsCount,
}: {
  range: ReturnType<typeof indicativeRangeV3>;
  personal: string;
  brandsCount: number;
}) {
  const lowAnim = useCountUp(range.low);
  const highAnim = useCountUp(range.high);
  const catEntries = Object.entries(range.perCategory) as [
    keyof typeof CATEGORY_LABELS_V3,
    { low: number; high: number },
  ][];

  return (
    <div
      className="card-soft p-6 sm:p-8 relative overflow-hidden animate-fade-in"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--primary) 4%, var(--card)) 0%, var(--card) 60%)",
        borderColor: "color-mix(in oklab, var(--primary) 18%, var(--hairline))",
      }}
    >
      <div className="grid gap-6 sm:gap-8 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary/70 font-medium">
            Indicative collection value
          </div>
          <div className="mt-2 font-display font-semibold tracking-tight text-primary text-4xl sm:text-5xl leading-[1.05]">
            <span>{formatCompactUSDV3(lowAnim)}</span>
            <span className="mx-2 text-primary/40 font-normal">–</span>
            <span>{formatCompactUSDV3(highAnim)}</span>
          </div>
          <div className="mt-3">
            <div
              className="h-1.5 w-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in oklab, var(--primary) 25%, transparent) 0%, var(--primary) 100%)",
              }}
            />
            <div className="mt-2 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Starter</span>
              <span>Mature</span>
            </div>
          </div>
          <p className="mt-5 text-sm sm:text-base text-foreground/80 leading-relaxed">
            A rough estimate of what a collection in your brands is worth at typical entry prices.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{personal}</p>
        </div>

        <div className="md:border-l md:border-hairline md:pl-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            How we got this
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <li className="flex gap-2">
              <span className="text-primary/60 mt-[2px]">•</span>
              <span>Based on the {brandsCount} brand{brandsCount === 1 ? "" : "s"} you picked</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary/60 mt-[2px]">•</span>
              <span>Using typical entry-level prices for each</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary/60 mt-[2px]">•</span>
              <span>Tier inferred automatically from your picks</span>
            </li>
          </ul>

          {catEntries.length > 0 && (
            <div className="mt-5 rounded-xl bg-surface-2/60 border border-hairline p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                By category
              </div>
              <div className="space-y-1.5 text-sm">
                {catEntries.map(([cat, v]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-foreground/75">{CATEGORY_LABELS_V3[cat]}</span>
                    <span className="font-display text-foreground/90 tabular-nums">
                      {formatCompactUSDV3(v.low)}
                      <span className="text-muted-foreground mx-1">–</span>
                      {formatCompactUSDV3(v.high)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
            Estimate based on typical entry prices — not investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}

function friendlyOtpError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("expired")) return "That code has expired. Request a new one.";
  if (m.includes("invalid") || m.includes("token")) return "That code is not valid. Double-check and try again.";
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Wait a moment and try again.";
  return msg || "Something went wrong. Try again.";
}
