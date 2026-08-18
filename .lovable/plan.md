# Real account deletion: server-side request, cancel, and a gated erasure job

## Findings first (all verified against the live database and the legal copy)

### 1. Scheduling primitives

Installed extensions today: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.

`pg_cron` (1.6.4) and `pg_net` (0.20.3) are **available but not installed**. They can be enabled in a migration. There is no Supabase edge function in this project and no other scheduled-job facility — the app's server code is TanStack Start server functions and server routes. So the only real option is: enable `pg_cron` + `pg_net`, and have cron POST to a `/api/public/*` route in this app, which does the work in TypeScript.

### 2. Foreign keys to `auth.users`

Every public-schema FK to `auth.users` is `ON DELETE CASCADE`:

| Table | FK | On delete |
|---|---|---|
| `public.profiles` | `profiles_id_fkey` | CASCADE |
| `public.portfolio_items` | `portfolio_items_user_id_fkey` | CASCADE |
| `public.watchlist` | `watchlist_user_id_fkey` | CASCADE |
| `public.user_roles` | `user_roles_user_id_fkey` | CASCADE |

So deleting the auth user removes all four. **Left behind** (no FK, keyed by email, not user id):

- `public.newsletter_subscribers` — holds `email`, `ip`, `user_agent` (1 row today)
- `public.contact_submissions` — holds `email`, `name`, `message`, `ip`, `user_agent` (1 row today)

Both are personal data and must be handled explicitly by email match at erasure time. Newsletter: delete the row (it is a standing consent record tied to the same person). Contact submissions: these can be a business/dispute record — recommendation is to anonymise (null the email/name/ip/user_agent, keep topic + message + timestamp) rather than delete, which is defensible under Art. 17(3)(e).

### 3. Storage mechanics — your understanding is correct

Deleting rows from `storage.objects` in SQL removes only the metadata row; the underlying S3 object is orphaned and unreachable, so the file is not erased. Erasure must go through the storage API. A pure-SQL `pg_cron` job therefore **cannot** complete the erasure. The job must call `purgePortfolioPhotosFor()` (already implemented, pagination bug already fixed) — which is why cron has to reach an HTTP endpoint in this app rather than run SQL only.

### 4. Legal copy — what it actually commits to

`privacy.md` §6: *"We retain personal information for as long as your account is active and as needed to provide the Service, then for a reasonable period to comply with legal obligations, resolve disputes, and enforce agreements. You can request deletion (Section 9); some data may be retained where legally required."*

`privacy.md` §9 (GDPR): *"you may have the right to access, rectify, erase, restrict, or object to processing… To exercise rights, contact privacy@price.you. We will verify your request as required by law."*

`terms.md` §13: *"Following account deletion, User Content will be deleted or anonymized within a reasonable period, except where retention is required by law or for legitimate business purposes."*

Nothing in the legal copy commits to 30 days, to a confirmation email, or to a response deadline. "Reasonable period" and the anonymisation carve-out both accommodate the design below. The only over-promise in the product is the in-app dialog, and the plan makes it true rather than softening it.

---

## Design recommendations

### Schema: a dedicated `account_deletion_requests` table

Recommended over columns on `profiles`, for one decisive reason: `profiles` is CASCADE-deleted with the auth user, so any audit trail stored there is destroyed by the very act it records. A separate table with **no FK to `auth.users`** survives, which is what GDPR accountability needs.

```
public.account_deletion_requests
  user_id      uuid primary key      -- no FK: must outlive the user
  requested_at timestamptz not null default now()
  delete_after  timestamptz not null  -- requested_at + 30 days
  cancelled_at  timestamptz
  executed_at   timestamptz
  reason        text                  -- optional free text from the dialog
  status        text not null default 'pending'  -- pending|cancelled|executed|failed
  last_error    text
```

No email, no name — only a uuid and timestamps, so the surviving record is not itself personal data in any meaningful sense. That is the compromise you described and I think it is the right one.

RLS: user can `select`/`insert`/`update` only their own row (`auth.uid() = user_id`); no delete for anyone. Grants to `authenticated` and `service_role` only, no `anon`.

The optional `reason` is user-authored free text and could theoretically contain personal data. It gets wiped to null at execution time, so the surviving audit row is uuid + timestamps only.

### Safety gating for the execution job

Four independent layers; all four must line up before a byte is destroyed.

1. **Kill switch, off by default.** A secret `ACCOUNT_DELETION_MODE` with values `dry_run` (default) and `execute`. Absent or anything other than the literal `execute` means dry run. The endpoint ships with the secret unset, so the first deploy cannot delete anyone.
2. **Selection is guarded in SQL, not in TypeScript.** The endpoint's query is `status = 'pending' and cancelled_at is null and executed_at is null and delete_after is not null and delete_after < now()`, with `limit 25` per run. `delete_after` is `not null` in the schema, so a null date cannot exist; the redundant `is not null` in the predicate means that even a future schema mistake selects nothing rather than everything.
3. **There is no `delete from` over a set.** The job never issues a bulk delete. It loops over the selected rows and, per user, calls the admin API for exactly one uuid. A malformed filter therefore cannot cascade into a mass deletion — the worst case is that the loop selects zero rows. Deletion is always `deleteUser(<single uuid>)`, never a statement with a `where` clause over user data.
4. **Per-user transaction discipline and idempotency.** Order is: storage purge → newsletter/contact handling → `auth.admin.deleteUser` (cascades the four tables) → mark `executed_at`, `status='executed'`, wipe `reason`. Any failure marks `status='failed'` with `last_error` and moves on; a row already `executed` or `cancelled` is never re-selected. Re-running the job is a no-op.

**Dry-run output I would want to see before flipping the switch**, logged per candidate: user id, requested_at, delete_after, hours past due, count of `portfolio_items` / `watchlist` / `user_roles` rows, object count and total bytes under `portfolio-photos/<uid>/`, whether a `newsletter_subscribers` row matches the email, whether a `contact_submissions` row matches, and the total candidate count. Trust it once you have seen a full day of runs where the candidate count is zero (nobody legitimately due), and one deliberate test request made from a throwaway account whose dry-run line matches that account's real contents exactly.

### Cancel cross-device

The request row is the single source of truth. The settings page and the dialog read it via a server function (`getMyDeletionRequest`), not localStorage; cancel writes `cancelled_at` + `status='cancelled'` server-side. Requesting on a phone then opening the laptop shows the pending banner immediately.

### Reconciling the dialog copy

The current text becomes **true as written** once this ships, with one exception. "Portfolio, brand watchlist, price alerts, and account" — portfolio, watchlist, roles and profile all cascade; photos are purged via the storage API; price alerts are derived from watchlist/portfolio so they go with them. The 30-day grace and cancel-anytime clauses become literally true.

The exception: "everything for <email> is permanently removed" is slightly wider than the design, because contact submissions are anonymised rather than deleted and a uuid-only audit row survives. Recommended change is one sentence appended to the dialog description: *"We keep a minimal record that the request was made and honoured — your user ID and the dates, with no personal details."* No other wording needs weakening.

### Existing localStorage state: discard it

`accountDeletionScheduled` is per-browser and unmigratable — the code cannot enumerate other people's localStorage. Given 16 users, all the accounts examined so far being team accounts, and no server record of anyone having requested deletion, discarding is fine. `account-mock.ts` is deleted outright; the key simply goes unread. Anyone who did click the button in a mock-era browser sees the banner disappear and can re-request against the real flow.

### Deleting the auth user needs the admin API

`auth.users` cannot be deleted with the app's normal RLS-bound client, and raw SQL deletes against the `auth` schema are forbidden by project policy. It requires `supabaseAdmin.auth.admin.deleteUser(userId)` using the service role. That call lives **only** inside the cron endpoint handler (`src/routes/api/public/run-account-deletions.ts`), loaded with a dynamic `await import()` after the caller has been verified. No client-reachable path can invoke it.

### What the user sees

- **Pending:** the existing red banner on settings, now driven by server state — deletion date, days remaining, "Cancel deletion". Recommended addition: the same banner in the dashboard shell so it is visible from any page, not just settings. The account remains fully usable during the grace period (no feature lockout) — that is what makes cancelling meaningful.
- **After cancelling:** banner disappears everywhere on next load, toast confirms, request row keeps `cancelled_at` for the audit trail. Re-requesting creates a fresh 30-day window on the same row.

---

## Technical outline

**Migration**
- `create extension pg_cron`, `create extension pg_net`
- create `account_deletion_requests` + GRANTs + RLS + policies (per §Schema above)
- schedule `run-account-deletions` daily at 03:00 UTC, `net.http_post` to `https://project--<id>.lovable.app/api/public/run-account-deletions` with the anon key in an `apikey` header

**New files**
- `src/lib/account-deletion.functions.ts` — `requestAccountDeletion({ reason })`, `cancelAccountDeletion()`, `getMyDeletionRequest()`, all `.middleware([requireSupabaseAuth])`, all scoped to `context.userId`
- `src/routes/api/public/run-account-deletions.ts` — POST handler: verifies the `apikey` header against the anon key, reads `ACCOUNT_DELETION_MODE`, selects candidates under the guarded predicate, and either logs the dry-run report or executes per-user

**Changed files**
- `src/components/settings/DeleteAccountDialog.tsx` — call the server function instead of `scheduleDeletion`; add the audit-record sentence
- `src/routes/_authenticated/app/settings.tsx` — banner reads `getMyDeletionRequest` via `useQuery`; cancel calls the server function and invalidates
- `src/components/app/DashboardShell.tsx` — surface the pending banner app-wide
- `src/lib/account-purge.functions.ts` — export the purge helper for the cron handler (already server-safe)

**Deleted**
- `src/lib/account-mock.ts` and its imports

**Secret to add later, not now:** `ACCOUNT_DELETION_MODE` (unset = dry run).

---

## Things riskier than your framing suggests

1. **`auth.admin.deleteUser` is irreversible and has no soft-delete step here.** Supabase supports `deleteUser(id, shouldSoftDelete = true)`. I would use soft delete first (banishes the user, keeps the row), then hard delete on a second pass 7 days later — but that contradicts "permanently removed after 30 days". My recommendation: hard delete at day 30 as the copy says, and rely on the dry-run gate rather than a second grace period. Worth an explicit decision from you.
2. **Storage purge failure must block the auth delete.** If `purgePortfolioPhotosFor` returns `ok: false` and the job proceeds to delete the user anyway, the photos become permanently unattributable orphans and erasure silently fails. The job must mark the request `failed` and stop, leaving the account intact for a retry.
3. **`newsletter_subscribers` and `contact_submissions` are matched by email**, which means the email has to be read *before* the auth user is deleted and held in memory for that one run. That is a brief, necessary processing step, but it must happen in the right order or the link is lost forever.
4. **pg_cron calling a preview/production URL is a hard dependency on that hostname.** If the endpoint 404s or the deploy is mid-flight, the job silently does nothing and nobody is notified. Recommend the handler always writes a run summary row (or at minimum a durable log line) so a silent failure is detectable.
5. **One point of disagreement with your framing:** you describe the current state as "a GDPR Article 17 erasure request being silently discarded". Accurate in effect, but the exposure is narrower than it sounds — no user has actually made a request (no server record exists and the four accounts examined are team accounts), and the legal copy directs erasure requests to privacy@price.you, which is a working channel. The in-app button over-promises; the company is not currently ignoring live statutory requests. Still worth fixing at this priority, just not an active breach.
