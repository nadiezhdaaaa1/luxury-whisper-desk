import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Field, friendlyAuthError, authInputClass, authSubmitClass } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — LuxTracker" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setForm(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) { setForm(friendlyAuthError(error.message)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="If an account exists for that email, we've sent a reset link.">
        <Link to="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset link."
      footer={<Link to="/login" className="text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={error ?? undefined}>
          <Input id="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error}
            className={authInputClass} />
        </Field>
        {form ? <p className="text-xs text-destructive">{form}</p> : null}
        <button type="submit" className={authSubmitClass} disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
