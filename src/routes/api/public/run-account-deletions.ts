// Scheduled GDPR Art. 17 erasure job.
//
// Called by pg_cron (see migration) once a day. SHIPS IN DRY RUN: unless the
// ACCOUNT_DELETION_MODE secret is exactly "execute", this endpoint deletes
// nothing — it only records what it would have done.
//
// Ordering per candidate is deliberate:
//   1. read the email (the link to newsletter/contact rows dies with the user)
//   2. purge storage — if that fails, STOP, mark failed, account stays intact
//   3. delete newsletter row, anonymise contact submissions
//   4. auth.admin.deleteUser (cascades profiles/portfolio/watchlist/roles)
//   5. mark the request executed and wipe its reason
import { createFileRoute } from "@tanstack/react-router";
import { purgePortfolioPhotosFor } from "@/lib/account-purge.functions";

type Step = string;
type Entry = {
  user_id: string;
  delete_after: string;
  outcome: "would_delete" | "executed" | "failed" | "skipped";
  steps: Step[];
  error?: string;
};

async function run(): Promise<Response> {
  const mode = process.env["ACCOUNT_DELETION_MODE"] === "execute" ? "execute" : "dry_run";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const nowIso = new Date().toISOString();
  const entries: Entry[] = [];
  let executed = 0;
  let failed = 0;

  // Hard guard: only pending rows, only a non-null delete_after strictly in the
  // past. There is no code path in this file that deletes without a candidate
  // row produced by exactly this query.
  const { data: candidates, error: listErr } = await supabaseAdmin
    .from("account_deletion_requests")
    .select("user_id, delete_after, requested_at")
    .eq("status", "pending")
    .not("delete_after", "is", null)
    .lt("delete_after", nowIso)
    .limit(50);

  if (listErr) {
    await supabaseAdmin.from("account_deletion_runs").insert({
      mode,
      candidates: 0,
      executed: 0,
      failed: 1,
      report: [{ outcome: "failed", error: listErr.message }],
    });
    return json({ ok: false, mode, error: listErr.message }, 500);
  }

  for (const c of candidates ?? []) {
    const entry: Entry = {
      user_id: c.user_id,
      delete_after: c.delete_after,
      outcome: mode === "execute" ? "executed" : "would_delete",
      steps: [],
    };

    // 1. email first — unrecoverable once the auth user is gone
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(c.user_id);
    const email = authUser?.user?.email ?? null;
    if (!authUser?.user) {
      entry.outcome = "skipped";
      entry.steps.push("auth user already absent — nothing to erase");
      if (mode === "execute") {
        await supabaseAdmin
          .from("account_deletion_requests")
          .update({ status: "executed", executed_at: new Date().toISOString(), reason: null })
          .eq("user_id", c.user_id)
          .eq("status", "pending");
      }
      entries.push(entry);
      continue;
    }
    entry.steps.push(`captured email (${email ? "present" : "none"})`);

    // 2. storage — a failure here blocks everything else
    if (mode === "execute") {
      const purge = await purgePortfolioPhotosFor(c.user_id);
      if (!purge.ok) {
        const msg = `storage purge failed after ${purge.removed} objects — account left intact`;
        entry.outcome = "failed";
        entry.error = msg;
        entry.steps.push(msg);
        failed++;
        await supabaseAdmin
          .from("account_deletion_requests")
          .update({ status: "failed", last_error: msg })
          .eq("user_id", c.user_id)
          .eq("status", "pending");
        entries.push(entry);
        continue;
      }
      entry.steps.push(`purged ${purge.removed} storage object(s)`);
    } else {
      const { data: objs } = await supabaseAdmin.storage
        .from("portfolio-photos")
        .list(c.user_id, { limit: 100, offset: 0 });
      entry.steps.push(`would purge storage (>= ${objs?.length ?? 0} object(s) listed)`);
    }

    // 3. newsletter + contact submissions, keyed by email
    if (email) {
      if (mode === "execute") {
        await supabaseAdmin.from("newsletter_subscribers").delete().eq("email", email);
        await supabaseAdmin
          .from("contact_submissions")
          .update({ email: null, name: null, ip: null, user_agent: null })
          .eq("email", email);
      }
      entry.steps.push(
        mode === "execute"
          ? "deleted newsletter row; anonymised contact submissions"
          : "would delete newsletter row and anonymise contact submissions",
      );
    } else {
      // Not silent: newsletter/contact rows are keyed by email only, so with no
      // email there is nothing to match. Recorded so it shows up in the report.
      entry.steps.push(
        "no email on auth user — newsletter/contact cleanup not applicable (nothing to key on)",
      );
    }

    // 3b. portfolio_removals survives the user (user_id is ON DELETE SET NULL) so
    // the churn signal outlives the account — but the free-text note must not.
    // Anonymise, don't delete, same as contact_submissions.
    if (mode === "execute") {
      await supabaseAdmin
        .from("portfolio_removals")
        .update({ note: null })
        .eq("user_id", c.user_id);
    }
    entry.steps.push(
      mode === "execute"
        ? "nulled portfolio removal notes"
        : "would null portfolio removal notes",
    );



    // 4. auth user — cascades profiles, portfolio_items, watchlist, user_roles
    if (mode === "execute") {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(c.user_id);
      if (delErr) {
        entry.outcome = "failed";
        entry.error = delErr.message;
        entry.steps.push(`auth delete failed: ${delErr.message}`);
        failed++;
        await supabaseAdmin
          .from("account_deletion_requests")
          .update({ status: "failed", last_error: delErr.message })
          .eq("user_id", c.user_id)
          .eq("status", "pending");
        entries.push(entry);
        continue;
      }
      entry.steps.push("deleted auth user (cascaded profile, portfolio, watchlist, roles)");

      // 5. audit record: uuid + timestamps only
      await supabaseAdmin
        .from("account_deletion_requests")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          reason: null,
          last_error: null,
        })
        .eq("user_id", c.user_id);
      executed++;
    } else {
      entry.steps.push("would delete auth user (cascades profile, portfolio, watchlist, roles)");
      entry.steps.push("would mark request executed and wipe its reason");
    }

    entries.push(entry);
  }

  // Durable run summary — every run, including empty ones, so a silent
  // "cron stopped firing" is visible as a gap in this table.
  await supabaseAdmin.from("account_deletion_runs").insert({
    mode,
    candidates: candidates?.length ?? 0,
    executed,
    failed,
    report: entries,
  });

  return json({ ok: true, mode, candidates: candidates?.length ?? 0, executed, failed, entries });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Authorised by a dedicated shared secret sent by pg_cron in its own header.
// NOT the anon/publishable key — that is public and ships to every browser.
// Fail closed: if the secret is unset or empty, every request is rejected.
function authorised(request: Request): boolean {
  const expected = process.env["ACCOUNT_DELETION_CRON_SECRET"] ?? "";
  if (expected.length === 0) return false;
  const given = request.headers.get("x-account-deletion-secret") ?? "";
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/run-account-deletions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorised(request)) return json({ error: "unauthorised" }, 401);
        return run();
      },
    },
  },
});
