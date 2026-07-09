
## Scope

Replace the current `/app` dashboard entirely with just two sections:
1. A period-scoped **Portfolio Value header** (two cards: value+trend, and category-share donut).
2. A row of **three Signal Stat Cards** that deep-link into `/app/signals`.

Remove: Important Signals panel, Latest Signals strip, Watchlist Targets panel, existing PortfolioValueTile/CategoryBreakdown tiles, "Welcome back" PageHeader block. Keep the small "estimates, not investment advice" disclaimer.

## New files

### `src/lib/demo-price-history.ts` — DEMO ONLY module
Single source for all value/trend/delta figures. Comment at top:
`// DEMO ONLY — synthetic history, replace with real pricing feed in Phase 2.`

Exports:
- `getItemHistory(itemId, purchasePrice, anchorCurrentPrice) → { date: string; value: number }[]` — seeded (mulberry32 keyed on itemId; stable across renders, NOT reshuffled), 400 daily points ending today. Mild upward drift (~0.05%/day) + wiggle (~1.5% stddev) so short windows can dip red while long windows trend green. Anchored so today's value equals the existing `getMockMarketPrice(...).current` for continuity with portfolio cards.
- `getPortfolioSeries(rows) → { date, value }[]` — sum of item series.
- `getCategorySeries(rows, category) → { date, value }[]`.
- `sliceForPeriod(series, period, customRange?) → { series, startValue, endValue, deltaPct }`.
- `Period = "all" | "week" | "month" | "quarter" | "year" | "custom"`.

### `src/components/dashboard/PeriodFilter.tsx` — reusable
Pill group `All time · Week · Month · Quarter · Year` + a `Custom range` button that opens a shadcn Popover with the shadcn `Calendar` in `mode="range"` (with `pointer-events-auto`). Controlled: `value: { period: Period; from?: Date; to?: Date }`, `onChange`. Emits `dashboard_period_changed` from the caller (not the component itself). Reusable so the Signals page "Timeline" filter can adopt it later.

### `src/components/dashboard/ValueCard.tsx`
- Label "Portfolio market value" (eyebrow).
- Big value in Manrope with count-up animation on mount and when period changes; respects `prefers-reduced-motion`.
- Arrow + `+/-X.X%` vs. start of period + muted `"this {period label}"` suffix. Green (`text-positive`) if up, burgundy (`text-alert`) if down.
- Sparkline (SVG, no axes/gridlines) for the period; stroke + fill gradient green if delta ≥ 0 else burgundy.
- Loading skeleton, empty state ("Add portfolio items to see market value"), inherits error from parent.

### `src/components/dashboard/CategoryDonutCard.tsx`
- SVG donut of category share (Watches/Jewelry/Bags) by current market value; omit categories with 0 items.
- **Slice color encodes direction over the selected period**, not identity:
  - Risers use a green ramp (`--positive` base with lightness ramp); fallers use a burgundy ramp (`--alert` base). Darkest shade = largest share within its direction group. Guarantee no two identical colors.
- Side list: swatch (exact slice color), category name, market value, arrow + `+/-X.X%`.
- **Two-way hover linking**: hovering a slice sets `hoveredKey`, which highlights the matching row (`bg-surface-2`) and dims other slices (lower opacity); hovering a row does the reverse. Slice tooltip: `"Watches — $59,230 (+5.1%)"`.
- Small legend at the bottom: green swatch "Rose this period", burgundy swatch "Fell this period".
- Rows always show arrow + % (never color-only). Empty state when portfolio has no items.

### `src/components/dashboard/SignalStatCard.tsx`
Clickable `Link` card (`hover:bg-surface-2 cursor-pointer`, flat card, no shadow). Props: `label`, `count`, `to`, `search`, `onClick` (fires `dashboard_signal_card_clicked`). Loading skeleton variant.

## Page rewrite — `src/routes/_authenticated/app/index.tsx`

Strip to:
- One `PageHeader` (keep title; drop "Welcome back" personalization? Keep it — cheap win).
- Estimates disclaimer.
- `<PeriodFilter />` (default `month`).
- Row 1: `<ValueCard>` + `<CategoryDonutCard>` in a `grid grid-cols-1 lg:grid-cols-3 gap-6` (value spans 2, donut spans 1).
- Row 2: three `<SignalStatCard>` in `grid grid-cols-1 sm:grid-cols-3 gap-4`.

Data:
- `useQuery` for profile, portfolio, watchlist, catalog, signals (reuse `fetchSignalsForSlugs` over `allRelevantSlugs`, filtered by `LIVE_CATEGORIES`).
- Compute signal counts filtered by `signal_date` within the selected period's `[start, end]`:
  - `total`: all live signals for followed brands.
  - `watched`: signals whose (brand_slug, model) match any active watchlist row (brand-level signal matches any watchlist row for that slug incl. brand-typed; piece signal matches exact brand+model or a brand-typed watchlist row for the same slug — mirrors existing `rankImportantSignals` logic).
  - `portfolio`: signals matching any portfolio row (brand-level → all items of that slug; piece → exact brand+model).
- Loading: skeletons for both header cards and 3 stat cards. Error: single retry card. Empty portfolio: value card shows empty state, donut shows empty state, stat cards still render with real counts.

Deep-link `to` for stat cards → `/app/signals` with `search`:
- `{ affected: "all" | "watchlist" | "portfolio", period }` plus `from`/`to` (YYYY-MM-DD) when `period === "custom"`.

## Signals page — accept the deep-link params

`src/routes/_authenticated/app/signals.tsx` currently ignores search. Update:
- `validateSearch` (zod + `fallback`) for `affected`, `period`, `from`, `to`.
- On mount, seed `affectsFilter` from `search.affected`. Period is accepted but currently not used to filter (matches spec — the reusable PeriodFilter will be wired into a Timeline filter in a follow-up; for now the value is preserved so links round-trip).

## Analytics

Extend `TrackEvent` union in `src/lib/analytics.ts`:
- `"dashboard_period_changed"` (payload: `{ period, from?, to? }`)
- `"dashboard_signal_card_clicked"` (payload: `{ affected, period, from?, to? }`)
- `"dashboard_viewed"` already exists — keep.
Remove firing of `important_signal_viewed` / `dashboard_latest_signal_clicked` from the dashboard (those UIs are gone; events remain in the union for other callers).

## Design tokens

Use existing `--positive` (green) and `--alert` (burgundy) tokens. Ramp shades via `color-mix(in oklch, var(--positive) X%, white)` inline styles for donut slices. Cards: `border border-hairline bg-background rounded-2xl`, no shadow.

## Testable outcomes

1. Period pills + custom-range calendar recompute value, delta, sparkline, donut colors, per-category deltas, and all three counts.
2. Value card animates count-up on load (skipped when `prefers-reduced-motion`), shows correct arrow color, sparkline color matches delta sign.
3. Donut slices are colored by direction with distinct shades when same-direction; hover links slice↔row both ways; tooltip states "Category — $value (+/-X.X%)"; legend explains the colors.
4. Selecting Week vs Year on the same portfolio can flip the sign (wiggle > drift for short windows).
5. Stat cards navigate to `/app/signals?affected=<v>&period=<v>[&from&to]` and the Signals page pre-selects the `Affected` filter accordingly.
6. All value/delta/sparkline data reads from `demo-price-history.ts`; signal counts come from the real `signals` query.
