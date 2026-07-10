# Dashboard right-side two-tab card

Replace the current right-side card on `/app` (today: `CategoryDonutCard` in the `lg:col-span-2` slot) with a new flat, stroke-only card that has two tabs. Latest signals is the default.

## New component

`src/components/dashboard/InsightsCard.tsx` — flat card (border, no shadow), light theme, 16/20px padding to match sibling dashboard cards. Header row: two tabs (`Latest signals` | `Movers`) on the left; on Movers, the title reflects the selected period ("Top movers · This month" etc.).

Props:
- `signals: SignalRow[]` (already period-filtered from parent = `signalsInPeriod`)
- `portfolio: PortfolioRow[]`
- `followedBrandCount: number`
- `period: PeriodKey`, `customRange?: { from, to }`

Tab state is local `useState`, initialized from `sessionStorage["dashboard.insightsTab"]` (default `"latest_signals"`); persisted on change.

## Tab 1 — Latest signals (default, real data)

Data: take `signalsInPeriod` (already filtered to slugs relevant to the user, in-period), then:
- Keep only signals whose `brand_slug` is in the user's followed-brand set (`followedBrands` — reuse `collectFollowedBrands` result from the page).
- Sort by `signal_date` desc, take 5.

Row layout (compact, reuse styling tokens from `SignalCard`):
- Left: signal-type badge using the same color mapping as the Signals page (extract the type→label/color map from `SignalCard.tsx` into `src/lib/signal-type.ts` so both files import it — no visual change to `SignalCard`).
- Middle: `Brand` or `Brand · Model`.
- Right: relative time (reuse the same formatter used on the Signals page).
- Whole row is a `<Link to="/app/signals">` (search params carry brand slug for optional focus). Click fires `dashboard_latest_signal_clicked`.

Footer: `View all signals →` link to `/app/signals`.

Empty state (in-period signals list is empty OR user follows no brands):
- Icon + "No signals yet" + "Add brands to your watchlist and we'll surface the latest moves here." + link to `/app/watchlist`.

## Tab 2 — Movers (demo data)

New module `src/lib/demo-movers.ts`:
- `getMovers(portfolio, period, customRange?)` → `{ gainers: Mover[]; losers: Mover[] }`.
- For each portfolio row, look up its series via existing `getPortfolioSeries` helpers / `DEMO_PRICE_HISTORY`, compute `%` change over the selected period (first vs last in-period point), and sort. Return up to 3 gainers (>0) and up to 3 losers (<0). Omit an empty group.

Rendering:
- Two subsections "Top gainers" / "Top losers", each up to 3 rows.
- Row: piece name (`Brand · Model`), current price, `+X.X%` (green) / `-X.X%` (burgundy). Uses semantic tokens already defined for gain/loss (green up, burgundy down).
- Row is a link to `/app/portfolio`.
- Card title/subtitle reflects the current period label.

Empty state (portfolio empty or no in-period movement):
- Icon + "No movement to show yet" + "Add pieces to your portfolio and we'll surface your biggest gainers and losers here each period." + `Add to portfolio` button → `/app/portfolio`.

## Dashboard page wiring (`src/routes/_authenticated/app/index.tsx`)

- Remove `<CategoryDonutCard>` from the right slot; render `<InsightsCard ... />` there. Keep `ValueCard` on the left (`lg:col-span-1`), Insights on the right (`lg:col-span-2`). `CategoryDonutCard` component file is kept in place (no deletion) in case it's reused elsewhere.
- Pass `signalsInPeriod` (already computed), `portfolio`, `followedBrands.length`, and current `pv`.

## Analytics (`src/lib/analytics.ts`)

Extend the event stub with:
- `dashboard_card_tab_switched` (`{ tab: "latest_signals" | "movers", period }`)
- `dashboard_latest_signal_clicked` (`{ brand_slug, signal_type, period }`)
- `dashboard_movers_row_clicked` (`{ brand_slug, direction: "gain" | "loss", period }`)
- Keep existing movers-related events if any.

## Guardrails / notes

- Latest signals uses REAL data (`fetchSignalsForSlugs` result already in the page), filtered to followed brands. Movers uses ONLY `demo-movers.ts` / `DEMO_PRICE_HISTORY` — the two data sources never mix.
- Card is flat: `border border-border rounded-2xl bg-card`, no shadow.
- Tab switch is instant (local state); session-remembered.
- Both tabs react to the existing dashboard `PeriodFilter`.

## Testable outcome

Right card opens on Latest signals showing up to 5 recent in-period signals for a quiz-seeded user; switching to Movers shows gainers/losers or the "Add to portfolio" empty state for new users; changing the period updates both tabs; refresh within the same session restores the last-selected tab.
