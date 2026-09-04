// Dev-only test panel back end.
//
// Every function here provisions accounts, grants paid access or deletes data,
// so each one is gated with the same fail-closed shape as
// `assertDevOnly()` in src/lib/checkout-anon.functions.ts: only a development
// build passes (`import.meta.env.DEV === true`, substituted at build time),
// anything else — including a missing env var on a production host — refuses.
//
// Nothing in the product links here; the panel is reachable only by typing the
// URL in a dev build.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevBuild } from "@/lib/dev-only";

function assertDevOnly() {
  // Fail-closed: only a development build passes; anything else refuses.
  if (!isDevBuild()) {
    throw new Error("dev test panel is disabled in production builds");
  }
}

/** Generated throwaway addresses. Only these can be wiped without typing them out. */
export const THROWAWAY_RE = /^dev\+[0-9a-z]+@example\.test$/;

export type Period = "monthly" | "quarterly" | "annual";

const PERIODS: Period[] = ["monthly", "quarterly", "annual"];

function parsePeriod(v: unknown): Period {
  if (typeof v === "string" && (PERIODS as string[]).includes(v)) return v as Period;
  throw new Error("Invalid period");
}

// ---------------------------------------------------------------- provision

export type ProvisionResult = { email: string; userId: string; tokenHash: string };

/**
 * Create a confirmed throwaway auth user and hand back a magic-link token hash
 * so the browser can start a real session for it without an inbox.
 *
 * Unauthenticated by necessity (there is no session yet) — which is exactly
 * why the dev gate above must hold.
 */
export const devProvisionThrowaway = createServerFn({ method: "POST" }).handler(
  async (): Promise<ProvisionResult> => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = `dev+${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}@example.test`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

    const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (lErr) throw new Error(lErr.message);
    const tokenHash = link.properties?.hashed_token ?? "";
    if (!tokenHash) throw new Error("Could not mint a session");

    return { email, userId: created.user.id, tokenHash };
  },
);

// ------------------------------------------------------------- gate states

/** credentials present / absent — app_metadata is service-role only. */
export const devSetCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ({ present: (i as { present?: unknown })?.present === true }))
  .handler(async ({ data, context }) => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      app_metadata: { needs_credentials: data.present ? null : true },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** onboarded yes / no. "Yes" writes the same quiz shape the real commit does. */
export const devSetOnboarded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ({ onboarded: (i as { onboarded?: unknown })?.onboarded === true }))
  .handler(async ({ data, context }) => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = data.onboarded
      ? {
          quiz_completed: true,
          onboarding_completed: true,
          segments: ["luxury_invest"],
          categories: ["watches", "bags"],
          brands: ["Rolex — Watches", "Hermès — Bags"],
          role: "collector",
        }
      : {
          quiz_completed: false,
          onboarding_completed: false,
          segments: [],
          categories: [],
          brands: [],
          role: null,
        };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SubState = "none" | "active" | "canceled_voluntary" | "canceled_past_due";

/**
 * Subscription / churn states.
 *
 * The two cancelled variants differ only by `past_due_since`, which is exactly
 * what the settings subscription section keys the "payment failed" copy on.
 */
export const devSetSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => {
    const raw = (i ?? {}) as { state?: unknown; period?: unknown };
    const states: SubState[] = ["none", "active", "canceled_voluntary", "canceled_past_due"];
    if (typeof raw.state !== "string" || !(states as string[]).includes(raw.state)) {
      throw new Error("Invalid state");
    }
    return { state: raw.state as SubState, period: parsePeriod(raw.period ?? "monthly") };
  })
  .handler(async ({ data, context }) => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const past = new Date(now - 3 * 24 * 3600_000).toISOString();

    const patch =
      data.state === "none"
        ? {
            plan: "free",
            billing_period: null,
            billing_status: "active",
            access_until: null,
            past_due_since: null,
          }
        : data.state === "active"
          ? {
              plan: "pro",
              billing_period: data.period,
              billing_status: "active",
              access_until: null,
              past_due_since: null,
            }
          : {
              // Cancelled: access already ended, so the gate treats it as unpaid.
              plan: "pro",
              billing_period: data.period,
              billing_status: "canceled",
              access_until: past,
              past_due_since: data.state === "canceled_past_due" ? past : null,
            };

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------------- wipe

export type WipeResult = {
  email: string;
  userId: string | null;
  deleted: Record<string, number>;
  remaining: Record<string, number>;
};

/**
 * Hard-wipe exactly one account: every app row keyed to the user, then the
 * auth user itself.
 *
 * Guard rail: an address that is not a generated throwaway is refused unless
 * `confirm` repeats it in full. Only ever touches the single resolved user id.
 */
export const devWipeAccount = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => {
    const raw = (i ?? {}) as { email?: unknown; confirm?: unknown };
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const confirm = typeof raw.confirm === "string" ? raw.confirm.trim().toLowerCase() : "";
    if (!email) throw new Error("Enter an email address");
    if (!THROWAWAY_RE.test(email) && confirm !== email) {
      throw new Error(
        "That address is not a generated throwaway — retype it in full in the confirm field.",
      );
    }
    return { email };
  })
  .handler(async ({ data }): Promise<WipeResult> => {
    assertDevOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    let userId: string | null = profile?.id ?? null;
    if (!userId) {
      // No profile row — resolve through Auth so a half-created account still clears.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === data.email)?.id ?? null;
    }
    if (!userId) throw new Error("No account with that address");

    const userTables = [
      "watchlist",
      "portfolio_items",
      "portfolio_removals",
      "notification_settings",
      "muted_alert_sources",
      "account_deletion_requests",
      "user_roles",
    ] as const;

    const { purgePortfolioPhotosFor } = await import("@/lib/account-purge.functions");
    await purgePortfolioPhotosFor(userId);

    const deleted: Record<string, number> = {};
    for (const table of userTables) {
      const { data: rows, error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", userId)
        .select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      deleted[table] = rows?.length ?? 0;
    }

    const { data: pRows, error: pErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select("id");
    if (pErr) throw new Error(`profiles: ${pErr.message}`);
    deleted["profiles"] = pRows?.length ?? 0;

    const { error: dErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (dErr) throw new Error(`auth: ${dErr.message}`);

    // Re-count so zero can be confirmed rather than assumed.
    const remaining: Record<string, number> = {};
    for (const table of userTables) {
      const { count } = await supabaseAdmin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      remaining[table] = count ?? 0;
    }
    const { count: pCount } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("id", userId);
    remaining["profiles"] = pCount ?? 0;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    remaining["auth_user"] = authUser?.user ? 1 : 0;

    return { email: data.email, userId, deleted, remaining };
  });
