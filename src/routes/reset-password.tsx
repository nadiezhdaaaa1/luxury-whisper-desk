import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Field, friendlyAuthError, authInputClass, authSubmitClass } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — PriceYou" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters"),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  path: ["confirm"], message: "Passwords don't match",
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places recovery tokens in the URL hash; the client picks them up
    // via detectSessionInUrl. Confirm we have a recovery session.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setInvalidLink(true);
      setReady(true);
    }, 400);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setInvalidLink(false); setReady(true);
      }
    });
    return () => { clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ password: f.password?.[0], confirm: f.confirm?.[0] });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) { setErrors({ form: friendlyAuthError(error.message) }); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/app", replace: true }), 900);
  }

  if (!ready) {
    return (
      <AuthLayout title="Set a new password">
        <div className="h-32 rounded-md bg-surface-2 animate-pulse" />
      </AuthLayout>
    );
  }
  if (invalidLink) {
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is invalid or expired.">
        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }
  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Taking you to your dashboard…">
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Pick something you haven't used before.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="New password" htmlFor="password" error={errors.password}>
          <Input id="password" type="password" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className={authInputClass} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <Input id="confirm" type="password" autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass} />
        </Field>
        {errors.form ? <p className="text-xs text-destructive">{errors.form}</p> : null}
        <button type="submit" className={authSubmitClass} disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
