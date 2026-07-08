## Build the Signals screen

Timeline feed filtered to the user's followed brands, seeded from `signals.csv`. Watches and Jewelry only in the live feed; Bags stay coming-soon.

### 1. Database (migration + seed)

New `public.signals` table (global reference data, all authed users read, no user writes):

- Columns: `id text primary key`, `type text` (price_increase | new_collection | discount | drop), `category text` (watches | jewelry | bags), `brand_slug text`, `brand_name text`, `segment text`, `model text null`, `title text`, `body text`, `recommended_action text`, `signal_date timestamptz not null`, `is_sample boolean default true`, `created_at timestamptz default now()`.
- Indexes on `brand_slug`, `category`, `signal_date desc`.
- RLS: enable; single policy `TO authenticated USING (true)` for SELECT. No insert/update/delete policy (only service_role writes).
- GRANT SELECT to authenticated; GRANT ALL to service_role.

Seed: insert all 424 rows from `signals.csv` with `signal_date = now() - (days_ago * interval '1 day')`. `is_sample = true` on every row.

### 2. Data layer — `src/lib/signals.ts`

- `SignalRow` type mirrors table columns.
- `SignalType = "price_increase" | "new_collection" | "discount" | "drop"`.
- `fetchSignalsForBrands(brandSlugs: string[])`: returns rows filtered by `brand_slug IN (...)` AND `category IN ('watches','jewelry')`, ordered `signal_date desc`. Returns `[]` when the input list is empty.
- `useSignalsForBrands(brandSlugs)`: React Query wrapper, key `["signals", sortedSlugs]`, `enabled: slugs.length > 0`.
- Helpers: `groupByDate(rows)` returns `[{ label: "Today" | "Yesterday" | "March 3", date, items }]`; `relativeTime(date)` returns `"2d ago"` / `"3w ago"` / `"just now"`.

### 3. Route — `src/routes/_authenticated/app/signals.tsx`

Resolve followed brands from the same source the Watchlist uses:

- `profileQ` (`fetchMyProfile`) + `wlQ` (`fetchWatchlist`).
- Union brand slugs from active watchlist rows AND profile brands, mapped through the catalog to `brand_slug`, then dropped to `watches` + `jewelry` only (bags removed from the live feed even if followed).

State (URL search params via `validateSearch`):
- `type`: "all" | SignalType (default "all")
- `category`: "all" | "watches" | "jewelry" (default "all")
- `brand`: string | null (a single `brand_slug`, default null)

Render:

```text
PageHeader "Signals" — subtitle: "Retail moves for brands you follow."
Disclaimer chip: "Signals are estimates, not investment advice."
Filter row (type pills · category pills · brand dropdown)

[Timeline]
  "Today"
    ├── SignalCard
    ├── SignalCard
  "Yesterday"
    ├── SignalCard
  "March 3"
    ├── SignalCard
```

States:
- Loading: header + 3 skeleton cards.
- Error: inline error card with retry (`router.invalidate()`).
- Empty — no followed brands: EmptyState "Start following brands to see signals" + CTA to `/app/watchlist`.
- Empty — followed brands but no matching signals: "No signals yet — we'll alert you the moment your brands move." (no fabricated rows).

### 4. `SignalCard` component

- Left rail: category icon (Watch / Gem icons from lucide) + a small type badge with distinct color/icon:
  - `price_increase` → TrendingUp, warm amber
  - `new_collection` → Sparkles, navy
  - `discount` → TagIcon, sage green
  - `drop` → Zap, deep plum
- Header: `brand_name` (+ `— model` when set), relative time on the right.
- Body: `title` (Manrope semibold), `body` line, `recommended_action` as a subtle uppercase micro-label.
- Footer CTA: "View positions" → `navigate({ to: "/app/watchlist", search: { brand: brand_slug } })` (watchlist already accepts brand focus; if not, pass through `?brand=` and let watchlist ignore extras — MVP link).

### 5. Analytics

Extend `TrackEvent` union in `src/lib/analytics.ts` with `"signals_viewed" | "signal_filtered" | "signal_view_positions_clicked"`. Fire:
- `signals_viewed` once on mount with `{ followedCount, resultCount }`.
- `signal_filtered` on each filter change with `{ type, category, brand }`.
- `signal_view_positions_clicked` on card CTA with `{ brand_slug, signal_id, type }`.

### 6. Guardrails enforced in code

- `fetchSignalsForBrands` early-returns `[]` when brand list is empty → no cross-user data leak.
- Query hard-filters `category IN ('watches','jewelry')` — bag signals never render even if a user's followed brands include a bag slug.
- Card copy renders only `title` / `body` / `recommended_action` verbatim from the row (percentages already in copy); no numeric formatting invents an absolute price.

### Technical notes

- Route is under `_authenticated/`, so SSR is off and Supabase reads use the browser client + user session (RLS as that user).
- Seed migration inserts ~424 rows in one `INSERT ... VALUES` batch after the table is created; `id` from CSV is the primary key so re-runs `ON CONFLICT (id) DO NOTHING`.
- No changes to existing brand/watchlist wiring — this feature reads from them, does not mutate.

### Verification

- `select count(*) from signals` → 424; `select count(*) from signals where category='bags'` → 123 (present but hidden in UI).
- Follow only Rolex + Omega + Cartier on the watchlist → timeline shows only rows for `rolex`, `omega`, `cartier-watches`, `cartier-jewelry`, grouped by date, newest first.
- Clear watchlist → empty state prompts "add brands"; add a brand with zero matching rows → honest "No signals yet" message.
- Toggle type filter → list narrows; analytics logs `signal_filtered`.
