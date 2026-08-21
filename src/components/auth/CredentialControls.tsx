// Shared credential setup controls — ONE implementation, two hosts:
// `/onboarding/credentials` and the reveal at the end of `/app/quiz`.
//
// Both paths go through the 3a server functions, which clear
// `app_metadata.needs_credentials` atomically with the act they attest. This
// component never writes the flag itself and never calls
// `supabase.auth.updateUser({ password })` directly.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import googleIcon from "@/assets/google-icon.svg.asset.json";
import { Input } from "@/components/ui/input";
import { Field, Divider, authInputClass, authSubmitClass } from "@/routes/login";
import {
  confirmIdentityLink,
  getAccountEmail,
  setAccountPassword,
} from "@/lib/credentials.functions";

/** Matches the server-side minimum in credentials.functions.ts. */
const MIN_PASSWORD = 8;

export function CredentialControls({
  redirectTo,
  onDone,
  submitLabel = "Set password and continue",
}: {
  /** Where Google should come back to — must be this same screen. */
  redirectTo: string;
  onDone: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const { data: account } = useQuery({
    queryKey: ["account-email"],
    queryFn: () => getAccountEmail(),
    staleTime: 60_000,
  });

  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (password.length < MIN_PASSWORD) {
      setPwError(`Use at least ${MIN_PASSWORD} characters`);
      return;
    }
    setBusy(true);
    try {
      // The server function derives the user from the verified bearer token and
      // never reads an email from the request, so the account address cannot
      // diverge from the one the subscription was bought under. The readOnly
      // field below is for clarity, not safety.
      await setAccountPassword({ data: { password } });
      await onDone();
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
          await onDone();
          return;
        }
        if (res.reason === "email_mismatch") {
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
      // linkIdentity, not a sign-in: attaches Google to the account the
      // subscription is already on. Throws when Manual Linking is disabled.
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
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
    <div>
      <button type="button" onClick={() => void linkGoogle()} className="btn-secondary w-full">
        <img
          src={googleIcon.url}
          width={16}
          height={16}
          alt=""
          aria-hidden
          className="h-4 w-4"
        />
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
          {busy ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
