# Free-tier enforcement (database triggers)

Three `BEFORE ROW` triggers enforce plan rules server-side. Client-side checks
still exist for UX, but the database is the authority — the caps were bypassable
by direct REST calls before these landed.

| Trigger | Table | Fires on | Enforces |
| --- | --- | --- | --- |
| `enforce_plan_immutable` | `public.profiles` | UPDATE | `plan` / `billing_period` can only change via `service_role` (or `supabase_admin` / `postgres`). Every other profile column stays user-writable. |
| `enforce_portfolio_free_cap` | `public.portfolio_items` | INSERT | Free plan: max 3 rows. |
| `enforce_watchlist_free_active_cap` | `public.watchlist` | INSERT, UPDATE | Free plan: max 10 rows with `is_active = true`. Only activations are checked (INSERT active, or UPDATE flipping `false → true`). |

Cap violations raise `P0001`; the plan lock raises `42501`.

## Important: the bodies must stay `LANGUAGE plpgsql`

Both cap functions decide with `SELECT count(*)`. That is only correct because
plpgsql performs a command-counter increment before each statement in the
function body, so rows already inserted by the *same* multi-row statement are
visible. Rewriting either body as `LANGUAGE sql` would make a single batched
`INSERT` of 4 portfolio rows (or 11 active watchlist rows) pass every check and
silently reopen the bypass. Verified: a batched insert returns 400 and leaves
0 rows.

## Downgrade still works

The caps gate *creation and activation only*. Existing over-cap rows from a
former Pro plan remain fully readable, editable and deletable, which is what the
"paused item" UI depends on.

## Disabling in an incident

If the triggers block legitimate writes (e.g. a billing bug leaves paying users
marked `free`), drop them. This is safe and reversible — no data is touched.

```sql
DROP TRIGGER IF EXISTS enforce_plan_immutable ON public.profiles;
DROP TRIGGER IF EXISTS enforce_portfolio_free_cap ON public.portfolio_items;
DROP TRIGGER IF EXISTS enforce_watchlist_free_active_cap ON public.watchlist;
```

The functions themselves are left in place, so re-enabling is just re-creating
the triggers (see `supabase/migrations/` for the original `CREATE TRIGGER`
statements).

## What the user sees

`src/lib/cap-errors.ts` maps the `P0001` cap errors to the same copy the
client-side cap uses, so the portfolio and watchlist write paths never show
"try again" for a condition retrying cannot fix. Raw Postgres text is never
displayed.
