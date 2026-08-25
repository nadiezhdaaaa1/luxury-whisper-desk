// Google identity linking for the settings screen.
//
// linkIdentity attaches Google to the CURRENT account; signInWithOAuth would
// instead sign the user in, possibly as a different account. Only the former is
// correct here.
//
// The email constraint is enforced server-side by confirmIdentityLink(): if the
// Google account's email differs from the account email, the identity is
// unlinked again and the caller is told. Manual linking must be enabled in the
// Supabase project or linkIdentity fails with manual_linking_disabled.
import { supabase } from "@/integrations/supabase/client";
import { confirmIdentityLink } from "@/lib/credentials.functions";

/** Distinct from onboarding's `py_link_google`, so the two flows never collide. */
export const LINK_FLAG = "py_link_google_settings";

function looksLikeManualLinkingDisabled(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("manual_linking") || m.includes("manual linking");
}

export async function beginGoogleLink(
  redirectTo: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    sessionStorage.setItem(LINK_FLAG, "1");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    sessionStorage.removeItem(LINK_FLAG);
    const message = err instanceof Error ? err.message : String(err);
    if (looksLikeManualLinkingDisabled(message)) {
      return {
        ok: false,
        message:
          "Google linking isn't enabled for this project yet — set a password instead for now.",
      };
    }
    return {
      ok: false,
      message: message
        ? `Google linking isn't available right now (${message}).`
        : "Google linking isn't available right now.",
    };
  }
}

export async function completeGoogleLink(): Promise<
  null | { ok: true } | { ok: false; message: string }
> {
  if (typeof window === "undefined") return null;
  if (sessionStorage.getItem(LINK_FLAG) !== "1") return null;
  sessionStorage.removeItem(LINK_FLAG);

  try {
    const res = await confirmIdentityLink();
    if (res.ok) return { ok: true };

    if (res.reason === "email_mismatch") {
      // Verified server-side: the mismatched identity must not stay attached.
      const { data } = await supabase.auth.getUserIdentities();
      const identity = data?.identities?.find((i) => i.identity_id === res.identityId);
      if (identity) await supabase.auth.unlinkIdentity(identity);
      return {
        ok: false,
        message: `That Google account is ${res.linkedEmail}, but this account is ${res.accountEmail}. Connect the Google account for ${res.accountEmail} instead.`,
      };
    }

    return { ok: false, message: "Google wasn't connected. Please try again." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Google wasn't connected. Please try again.",
    };
  }
}
