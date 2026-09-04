import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { SocialButtons } from "@/components/auth/SocialButtons";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";


export const authInputClass =
  "shadow-none rounded-2xl px-4 border-hairline focus-visible:ring-0 focus-visible:border-primary-muted";
export const authSubmitClass = "btn-primary w-full disabled:opacity-60";

const searchSchema = z
  .object({
    redirect: z.string().optional(),
  })
  .partial();

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Log in — PriceYou" },
      {
        name: "description",
        content:
          "Sign in to your PriceYou dashboard to track your luxury watch, jewelry, and bag collection and market price alerts.",
      },
      { property: "og:title", content: "Log in to PriceYou" },
      {
        property: "og:description",
        content: "Access your PriceYou dashboard to track your luxury collection.",
      },
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
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function sendSignInLink() {
    setLinkError(null);
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      setLinkError("Enter your email above first.");
      return;
    }
    setLinkBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + "/app" },
    });
    setLinkBusy(false);
    if (error) {
      setLinkError(friendlyAuthError(error.message));
      return;
    }
    setLinkSent(true);
  }


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/app", replace: true });
    });
  }, [navigate, redirect]);

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
    track("sign_in", { method: "password" });
    navigate({ to: redirect ?? "/app", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-9 pb-16">
        <div className="px-4 pt-8">
          <AuthHeader />

          <h1 className="pt-6 font-display text-[28px] font-medium leading-[33.6px] tracking-[-0.7px] text-foreground">
            Welcome back
          </h1>
          <p className="pt-2 text-base leading-6 text-muted-foreground">
            Sign in to your price.you dashboard
          </p>
        </div>

        {/* Card — two nested layers */}
        <div className="mt-8">
          <AuthCard>
            <SocialButtons mode="signin" />

            <AuthOrDivider className="pt-5" />

            <form onSubmit={submit} className="pt-5" noValidate>

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
              <div className="py-4">
                <Field
                  label="Password"
                  htmlFor="password"
                  error={errors.password}
                  extra={
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot?
                    </Link>
                  }
                >
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
              </div>
              {errors.form ? <p className="pb-2 text-xs text-destructive">{errors.form}</p> : null}
              <button type="submit" className={authSubmitClass} disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Recovery for "I paid but never set a password": a sign-in link. It must
                not create accounts — shouldCreateUser: false. Landing back in re-enters
                the app gate, which routes by flags. */}
            <div className="px-4 pt-6">
              <div className="border-t border-[#cfdbe2] pt-5">
                {linkSent ? (
                  <p className="text-xs text-muted-foreground">
                    If that address has an account, a sign-in link is on its way. Open it on this
                    device to continue.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Paid but never set a password? Enter your email and we'll send a sign-in link.
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary hover:underline disabled:opacity-60"
                      disabled={linkBusy}
                      onClick={() => void sendSignInLink()}
                    >
                      {linkBusy ? "Sending…" : "Email me a sign-in link"}
                    </button>
                    {linkError ? <p className="mt-2 text-xs text-destructive">{linkError}</p> : null}
                  </>
                )}
              </div>
            </div>
          </AuthCard>
        </div>


        <p className="pt-5 text-center text-sm leading-5 text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}


export function Field({
  label,
  htmlFor,
  error,
  extra,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-xs font-medium">
          {label}
        </Label>
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
