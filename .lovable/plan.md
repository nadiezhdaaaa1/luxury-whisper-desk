# Portfolio screen redesign

Match the attached screenshots. Purchase values stay real; market values come from ONE isolated demo module. Add modal is not touched.

## 1. New: `src/lib/demo-market-prices.ts` (single source of truth for fake prices)

```
// DEMO ONLY — placeholder prices, replace with real pricing source in Phase 2.
export const DEMO_MARKET_PRICES = true;
export function getMockMarketPrice(itemId, purchasePrice): { current, low, high }
```

- Deterministic per `itemId` per browser session (seeded PRNG from `itemId` + a per-session salt held in module scope) so numbers don't flicker between renders.
- If `purchase_price` present: offset ±5–20% → `current`; `low = current * (1 - 4–10%)`, `high = current * (1 + 4–10%)`.
- If no purchase price: anchor to a modest placeholder (e.g. $500) with same range logic.
- Also exports `summarizeMarket(rows)` returning `{ all, watches, jewelry, bags }` totals + `pctVsPurchase` per group.
- Every consumer imports from this file only. No fake prices anywhere else.

## 2. Portfolio Breakdown header — `src/components/portfolio/PortfolioBreakdown.tsx` (replaces `TotalValueHeader`)

Flat card, hairline border, no shadow. Top-right pill toggle: `MARKET VALUE | PURCHASE VALUE` (Purchase = default).

Four columns: `ALL n · WATCHES n · JEWELRY n · BAGS n` (icons match category, counts real).
- Purchase mode: sum of `purchase_price` per group (real).
- Market mode: sum of `getMockMarketPrice(...).current` per group + colored arrow & `+/-X%` vs. purchase sum (green up = `text-emerald-600`, burgundy down = existing `text-destructive` / signals-red token).

Fires `portfolio_value_tab_switched` with `{ tab: "purchase" | "market" }`.

## 3. Item card — rewrite `src/components/portfolio/PortfolioCard.tsx`

Flat card (`border border-hairline`, no shadow), photo aspect 4/3, tier badge top-left (compute tier from `useBrandsCatalog` + brand/category, fall back to "LUXURY"), 3-dot menu top-right (Edit, Remove → keeps existing confirm dialog wiring on the page).

Body:
- Brand (display font) + model (muted).
- `Purchase price  $X` (real; muted label, value bold). Hidden if none.
- Range bar: horizontal track, burgundy on left → green on right (linear gradient using existing destructive + emerald tokens), with a small circular marker positioned at `(current - low) / (high - low)`. Low value label bottom-left (burgundy), high value bottom-right (green).
- `Market price  $X` row (demo).
- Change indicator: arrow + `+/-X%` vs. purchase price (green up / burgundy down). Omit when purchase price missing.

All market data via `getMockMarketPrice(row.id, row.purchase_price)`.

## 4. Filters + grouping — update `src/routes/_authenticated/app/portfolio.tsx`

Replace current single-chip category filter with three multi-select popovers styled to match watchlist (`Categories`, `Grades`, `Brands`) + refresh icon (clears all three). Reuse watchlist's popover pattern (extract minimal helper in the same file — keep scope local, no shared refactor).

- Grades = tier list from catalog (`luxury_invest | mid_market | mass_market` → labels "Luxury", "Mid-market", "Mass-market").
- Brands = distinct brands present in the user's portfolio.
- Compact "Add" button (pill, matches watchlist Add) top-right of filter row.
- Group filtered rows by category with header `<icon> WATCHES  n` etc. (order: watches, jewelry, bags). Skip empty groups.
- Empty state (no items at all): centered clipboard icon + italic muted "Waiting for you to add your first piece" (matches screenshot; remove current EmptyState buttons for this state).
- Filtered-but-empty state: keep short message.
- Free cap 10 + upsell dialog: unchanged.

## 5. Analytics — `src/lib/analytics.ts`

Add to the `TrackEvent` union: `"portfolio_value_tab_switched"`. `portfolio_item_edited` and `portfolio_item_removed` already exist.

## 6. Out of scope

- `AddEditPortfolioModal` — untouched.
- Real pricing feed — Phase 2.
- Dashboard / signals surfaces.

## Testable outcome

Empty portfolio shows clipboard + "Waiting for you to add your first piece". With items: breakdown header toggles Purchase (real sums) ↔ Market (mock sums w/ % per category). Each card shows real purchase price, low→high range bar with marker, mock market price, and green/burgundy % change. All fake numbers stable per session and sourced only from `demo-market-prices.ts`.
