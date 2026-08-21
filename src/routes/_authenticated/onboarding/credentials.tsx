// Credential setup for accounts the billing webhook created.
//
// Minimal and functional: the reveal-screen redesign is a separate step. Styling
// is reused from signup.tsx (Field / authInputClass / authSubmitClass).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Field, Divider, authInputClass, authSubmitClass } from "@/routes/login";
import {
  confirmIdentityLink,
  getAccountEmail,
  setAccountPassword,
} from "@/lib/credentials.functions";

export const Route = createFileRoute("/_authenticated/onboarding/credentials")({
  head: () => ({
    meta: [{ title: "Set up sign-in — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: CredentialsPage,
});

function CredentialsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account } = useQuery({
    queryKey: ["account-email"],
    queryFn: () => getAccountEmail(),
    staleTime: 60_000,
  });

  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish() {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["access"] });
    await navigate({ to: "/app", replace: true });
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (password.length < 8) {
      setPwError("Use at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      // Server-side: it sets the password and clears needs_credentials in the
      // same handler. The user comes from the verified bearer token — no email
      // is read from the request at all, so the account address cannot diverge
      // from the one the subscription was bought under. The readOnly field
      // above is for clarity, not safety.
      await setAccountPassword({ data: { password } });
      await finish();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not set your password.");
      setBusy(false);
    }
  }

  // Returning from the Google round trip: verify server-side, then clear.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("py_link_google") !== "1") return;
    sessionStorage.removeItem("py_link_google");
    void (async () => {
      try {
        const res = await confirmIdentityLink();
        if (res.ok) {
          await finish();
          return;
        }
        if (res.reason === "email_mismatch") {
          // Refuse the link, keep the session.
          const { data } = await supabase.auth.getUserIdentities();
          const identity = data?.identities?.find((i) => i.identity_id === res.identityId);
          if (identity) await supabase.auth.unlinkIdentity(identity);
          setLinkError(
            `That Google account is ${res.linkedEmail}. Your subscription is on ${res.accountEmail} — link that Google account, or set a password instead.`,
          );
          return;
        }
        setLinkError("Google wasn't linked. Try again, or set a password instead.");
      } catch (err) {
        setLinkError(err instanceof Error ? err.message : "Google wasn't linked.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function linkGoogle() {
    setLinkError(null);
    try {
      sessionStorage.setItem("py_link_google", "1");
      // linkIdentity, not a sign-in: this attaches Google to the account the
      // subscription is already on. Throws when Manual Linking is disabled.
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin + "/onboarding/credentials" },
      });
      if (error) throw error;
    } catch (err) {
      sessionStorage.removeItem("py_link_google");
      setLinkError(
        err instanceof Error && err.message
          ? `Google linking isn't available right now (${err.message}). Set a password instead.`
          : "Google linking isn't available right now. Set a password instead.",
      );
    }
  }

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Choose how you'll sign in"
      subtitle="Your subscription is active. Set a password so you can get back in."
    >
      <button type="button" onClick={() => void linkGoogle()} className="btn-secondary w-full">
        Continue with Google
      </button>
      {linkError ? <p className="mt-2 text-xs text-destructive">{linkError}</p> : null}
      <Divider />
      <form onSubmit={submitPassword} className="space-y-4" noValidate>
        <Field label="Account email" htmlFor="account-email">
          <Input
            id="account-email"
            type="email"
            value={account?.email ?? ""}
            readOnly
            disabled
            className={authInputClass}
          />
        </Field>
        <Field label="Password" htmlFor="new-password" error={pwError ?? undefined}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!pwError}
            className={authInputClass}
          />
        </Field>
        <button type="submit" className={authSubmitClass} disabled={busy}>
          {busy ? "Saving…" : "Set password and continue"}
        </button>
      </form>
    </AuthLayout>
  );
}
