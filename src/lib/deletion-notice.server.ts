// Account-deletion notices — the ONLY transactional email path in the app.
//
// Why this exists at all: permanent, irreversible destruction of a user's data
// with no notice to that user is not something we are willing to ship. Two
// events, both security-critical and not opt-outable:
//   - deletion_requested: a grace window started; here is how to stop it
//   - deletion_executed:  the data is gone
//
// STATUS: no transactional email provider is configured for this project.
// Supabase sends its own auth mails (signup confirm, password reset) but has no
// API for arbitrary app mail. This module is therefore wired, correct and
// ready, and FAILS LOUDLY when the provider is missing. It never pretends to
// have sent anything.
//
// To turn it on, set two secrets and nothing else changes:
//   RESEND_API_KEY   — provider API key
//   DELETION_FROM_EMAIL — verified sender, e.g. "PriceYou <noreply@price.you>"

export type DeletionNoticeKind = "deletion_requested" | "deletion_executed";

export type DeletionNoticeResult =
  | { sent: true; provider: "resend" }
  | { sent: false; reason: "no_provider" | "no_recipient" | "provider_error"; detail?: string };

function subjectAndBody(
  kind: DeletionNoticeKind,
  data: { deleteAfter?: string },
): { subject: string; text: string } {
  if (kind === "deletion_requested") {
    const when = data.deleteAfter ? new Date(data.deleteAfter).toUTCString() : "in 30 days";
    return {
      subject: "Your PriceYou account is scheduled for deletion",
      text: [
        "We received a request to delete your PriceYou account.",
        "",
        `Your account and all of its data will be permanently erased after ${when}.`,
        "Until then everything keeps working, and you can stop the deletion at any",
        "time from Settings → Danger zone in the app.",
        "",
        "If you did not request this, sign in and cancel the deletion now.",
      ].join("\n"),
    };
  }
  return {
    subject: "Your PriceYou account has been deleted",
    text: [
      "Your PriceYou account and its data have now been permanently deleted.",
      "",
      "This cannot be undone. Nothing further is stored about you beyond a",
      "record that a deletion took place, which contains no personal data.",
      "",
      "Thank you for having used PriceYou.",
    ].join("\n"),
  };
}

/**
 * Best-effort notice. Never throws: a mail failure must not abort or reverse a
 * deletion. Every non-send is logged at error level so it is visible in logs.
 */
export async function sendDeletionNotice(
  kind: DeletionNoticeKind,
  to: string | null | undefined,
  data: { deleteAfter?: string } = {},
): Promise<DeletionNoticeResult> {
  if (!to) {
    console.error(`[deletion-notice] NOT SENT (${kind}): no recipient email on the account.`);
    return { sent: false, reason: "no_recipient" };
  }

  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["DELETION_FROM_EMAIL"];
  if (!apiKey || !from) {
    console.error(
      `[deletion-notice] NOT SENT (${kind}) to ${to}: no transactional email provider is ` +
        `configured. Set RESEND_API_KEY and DELETION_FROM_EMAIL. The user received NO notice ` +
        `about the destruction of their account data.`,
    );
    return { sent: false, reason: "no_provider" };
  }

  const { subject, text } = subjectAndBody(kind, data);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[deletion-notice] NOT SENT (${kind}): provider ${res.status}: ${detail}`);
      return { sent: false, reason: "provider_error", detail: `${res.status}` };
    }
    console.info(`[deletion-notice] sent (${kind})`);
    return { sent: true, provider: "resend" };
  } catch (e) {
    console.error(`[deletion-notice] NOT SENT (${kind}): request failed`, e);
    return { sent: false, reason: "provider_error", detail: String(e) };
  }
}
