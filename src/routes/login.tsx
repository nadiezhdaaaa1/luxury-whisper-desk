import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { TwoFactorChallenge } from "@/components/auth/TwoFactorChallenge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

export const authInputClass =
  "shadow-none rounded-2xl h-11 px-4 bg-background border-hairline focus-visible:ring-0 focus-visible:border-champagne";
export const authSubmitClass = "btn-primary w-full disabled:opacity-60";

const searchSchema = z.object({
  redirect: z.string().optional(),
}).partial();

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Log in — PriceYou" },
      { name: "description", content: "Sign in to your PriceYou dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password is required"),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/app", replace: true });
    });
  }, [navigate, redirect]);

  async function checkAAL() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.currentLevel === "aal1") {
      setNeeds2FA(true);
    } else {
      track("sign_in", { method: "password" });
      navigate({ to: redirect ?? "/app", replace: true });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      setErrors({ form: friendlyAuthError(error.message) });
      return;
    }
    await checkAAL();
  }

  if (needs2FA) {
    return (
      <AuthLayout eyebrow="Two-factor" title="Verify it's you">
        <TwoFactorChallenge
          onVerified={() => {
            track("sign_in", { method: "password", mfa: true });
            navigate({ to: redirect ?? "/app", replace: true });
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your PriceYou dashboard."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <SocialButtons mode="signin" />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            className={authInputClass}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}
          extra={
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </Link>
          }>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            className={authInputClass}
          />
        </Field>
        {errors.form ? <p className="text-xs text-destructive">{errors.form}</p> : null}
        <button type="submit" className={authSubmitClass} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function Field({
  label, htmlFor, error, extra, children,
}: { label: string; htmlFor: string; error?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
        {extra}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="flex-1 h-px bg-hairline" />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
      <div className="flex-1 h-px bg-hairline" />
    </div>
  );
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email first.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "An account with this email already exists.";
  if (m.includes("password") && m.includes("pwned"))
    return "This password appeared in a data breach — choose another.";
  if (m.includes("weak") || m.includes("password should be"))
    return "Password is too weak. Use at least 8 characters.";
  return message || "Something went wrong. Try again.";
}
