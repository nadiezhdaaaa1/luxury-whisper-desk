
## Goal

When `profiles.plan = "free"` and the user has more than `FREE_PORTFOLIO_CAP` (10) portfolio items, the oldest 10 stay Active and the rest become Paused (reduced card). Breakdown totals count Active only. Auto-promotion on delete and full restore on re-upgrade both happen automatically because the Active/Paused split is derived from `plan` + `created_at`, not stored on the row. No DB schema change, no data ever deleted.

## Changes

### 1. `src/lib/subscription.ts`
- Add a derived helper next to `readOnlyPortfolioIds`:
  - `splitPortfolioByPlan(rows, plan)` → `{ active: PortfolioRow[], paused: PortfolioRow[] }`, sorted oldest-first, using `FREE_PORTFOLIO_CAP` when plan is not `"pro"` (Pro → all active, paused = []).
- Keep `readOnlyPortfolioIds` (it stays the source of truth for "which rows are paused"); reimplement it in terms of `splitPortfolioByPlan` so both agree.
- Leave `downgradeToFree` / `upgradeToPro` untouched for portfolio — the split is derived, so flipping `profiles.plan` alone produces the correct Active/Paused view. Update the trailing comment to say so explicitly.

### 2. `src/routes/_authenticated/app/portfolio.tsx`
- Compute `{ active, paused } = splitPortfolioByPlan(rows, profileQ.data?.plan)`.
- Apply the existing filter logic to `active` and `paused` separately, then group each by category with the current `CAT_ORDER` / `CAT_ICON` layout.
- Pass **`active`** (not `rows`) to `<PortfolioBreakdown rows={active} />` so header totals + per-category counts exclude paused items.
- Render Active sections first, unchanged.
- If `paused.length > 0`, render below Active:
  - Burgundy limit banner, styling identical to Watchlist (`background: #5a1a2b`, `color: #fdf3ef`, `rounded-[12px] px-4 py-3 text-sm font-medium`):
    `Free accounts have a {FREE_PORTFOLIO_CAP}-item limit. Upgrade to keep tracking all of them. Upgrade` — the word "Upgrade" is an `<a href="/app/upgrade">` firing `track("upgrade_click", { from: "portfolio_cap" })`.
  - A "Paused" section header, then the paused rows grouped by category using the same section layout.
  - Each paused `<PortfolioCard>` gets `readOnly` so it renders the already-specified reduced card (photo + brand/model + purchase price + 3-dot menu only).
- Auto-promotion on removing an Active item is automatic: after `invalidateQueries`, `splitPortfolioByPlan` recomputes and the next oldest paused row shifts into the active slice. No extra code.
- Re-upgrade is automatic: when `profiles.plan` flips to `"pro"`, `paused` is empty, the banner and Paused section disappear, and totals include everything.

### 3. Nothing else
- No migration. Entitlement stays a single source of truth on `profiles.plan`. The cap remains the single constant `FREE_PORTFOLIO_CAP` in `src/lib/portfolio.ts`.

## Verification against the testable outcome

Pro user with 25 items downgrades → `plan="free"` → `splitPortfolioByPlan` returns 10 oldest active + 15 paused → breakdown shows totals for the 10 active only, burgundy banner appears above the Paused section, paused cards render reduced. Removing an active item drops active to 9; on refetch the split promotes the oldest paused into active automatically. Re-upgrade flips `plan="pro"` → paused becomes empty, all 25 rejoin the totals. Nothing deleted anywhere in either direction.
