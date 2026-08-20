import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { Input } from "@/components/ui/input";
import { Field, Divider, friendlyAuthError, authInputClass, authSubmitClass } from "./login";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — PriceYou" },
      {
        name: "description",
        content:
          "Create your free PriceYou account and start tracking price alerts, portfolio value, and target prices across watches, jewelry, and bags.",
      },
      { property: "og:title", content: "Create your PriceYou account" },
      {
        property: "og:description",
        content:
          "Start tracking price alerts and portfolio value with PriceYou — free to try.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

const schema = z.object({
  displayName: z.string().trim().min(1, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

function SignupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: f.displayName?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/app",
        data: { display_name: parsed.data.displayName },
      },
    });
    setLoading(false);
    if (error) {
      setErrors({ form: friendlyAuthError(error.message) });
      return;
    }
    track("sign_up", { method: "password" });
    if (data.session) {
      navigate({ to: "/app", replace: true });
    } else {
      setPendingConfirm(true);
    }
  }

  if (pendingConfirm) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="We sent you a confirmation link to finish signing up."
      >
        <Link to="/login" className="text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Join PriceYou"
      title="Create your account"
      subtitle="Price alerts, brand watchlist, portfolio — in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SocialButtons mode="signup" />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name" htmlFor="displayName" error={errors.displayName}>
          <Input
            id="displayName"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={!!errors.displayName}
            className={authInputClass}
          />
        </Field>
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
        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            className={authInputClass}
          />
        </Field>
        {errors.form ? <p className="text-xs text-destructive">{errors.form}</p> : null}
        <button type="submit" className={authSubmitClass} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
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
      </form>
    </AuthLayout>
  );
}
