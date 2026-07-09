# Watchlist: gap-to-target on piece cards

Replace the "· gap coming soon" placeholder on piece cards with a live gap indicator driven by the existing DEMO market-price module. Brand cards remain unchanged.

## 1. Reuse the shared DEMO price source

- Import `getMockMarketPrice` from `@/lib/demo-market-prices` inside `src/routes/_authenticated/app/watchlist.tsx`.
- No new price module, no duplicated fake-price logic. Same "DEMO ONLY — replace in Phase 2" boundary already in that file.
- Seed the mock price with the watchlist row's `id` and pass `row.target_price` as the anchor (so the mock current fluctuates around the user's target, matching how the portfolio anchors around purchase price).

## 2. Piece-card gap rendering (BUYER semantics — inverse of portfolio)

In `ItemCard` (watchlist.tsx, ~line 615), when `isPiece && row.target_price != null`:

- Compute `current = getMockMarketPrice(row.id, row.target_price).current`.
- `gapPct = (current − target) / target * 100`.
- Direction (BUYER's view):
  - `current > target` → **bad for buyer** → burgundy (`text-[color:var(--alert)]`), `ArrowUpRight`, label `+N%`.
  - `current <= target` → **good for buyer** → green (`text-[color:var(--positive)]`), `ArrowDownRight`, label `−N%` (use absolute value; show `0%` with green/down when exactly at target).
- Render: `TARGET $X · [arrow] N%` — the arrow + percent replace the current `· gap coming soon` span, colored per rule above, using the same small inline layout as today.
- Round percent to one decimal (matches PortfolioCard style).

## 3. No-target pieces

Keep existing "TARGET not set" line as-is. No gap is shown without a target. (No new "set a target" affordance beyond what already exists — the row menu already has "Set target".)

## 4. Brand cards

Unchanged. Brand rows have no `target_price` and no gap block.

## 5. Guardrails

- Only `src/routes/_authenticated/app/watchlist.tsx` changes.
- No edits to `src/lib/demo-market-prices.ts` (already the single source of truth).
- No changes to real user data (`target_price` stays the entered number); only `current` and the derived gap are demo.
- No new analytics events required.

## Testable outcome

- Piece with target where demo current > target: burgundy `↑ +N%` next to target.
- Piece with target where demo current ≤ target: green `↓ −N%` (or `↓ 0%`).
- Piece without target: existing "not set" line, no gap.
- Brand cards: visually identical to before.
