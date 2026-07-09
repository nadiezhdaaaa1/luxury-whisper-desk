# Populate "Last signal" on Watchlist & Portfolio cards

Replace the hardcoded "no signals yet" line on Watchlist and Portfolio cards with the real most‑recent signal for that card, matched strictly on `brand_slug` (and `model` for piece cards). No layout changes; bag cards keep their "Coming soon" tag.

## 1. Shared helper — `src/lib/signals.ts`

Add two exports so Watchlist, Portfolio, and Signals all stay consistent:

- `resolveBrandSlug(catalog: BrandRow[], brand: string, category: Category): string | null` — looks up `brand_slug` from the catalog by display name + category. This is how a `Cartier` + `watches` row becomes `cartier-watches` and a `Cartier` + `jewelry` row becomes `cartier-jewelry`. Custom (non‑catalog) brands return `null` → treated as "no signal".
- `pickLastSignal(signals, { brand_slug, model? }): SignalRow | null`
  - Brand card (`model` omitted / null): most recent signal where `signal.brand_slug === brand_slug` — brand‑level OR any piece of that brand.
  - Piece card (`model` provided): most recent signal where `signal.brand_slug === brand_slug` AND `signal.model === model` (case‑insensitive exact match). No fallback to brand‑level.

Relative time already comes from `relativeTime(iso)` in the same file — reuse it verbatim so wording matches the Signals page.

## 2. Fetch signals once per screen

Add `fetchSignalsForSlugs(brandSlugs: string[])` that mirrors `fetchSignalsForBrands` but does NOT filter by `LIVE_CATEGORIES` — Watchlist/Portfolio need to look up signals for whichever slugs their rows use (bags are excluded in the UI, not the query). Wrap in `useSignalsForSlugs`.

On each screen:
1. Load catalog (`useBrandsCatalog`) + rows.
2. Compute the distinct set of `brand_slug`s across all non‑bag rows using `resolveBrandSlug`.
3. Call `useSignalsForSlugs(slugs)` (skipped when empty).
4. Build a `signalsByKey` map keyed by `brand_slug` and `brand_slug|model` so per‑card lookup is O(1).

## 3. Watchlist card — `src/routes/_authenticated/app/watchlist.tsx`

`ItemCard` gets a new prop `lastSignal: SignalRow | null`. The existing "Last signal — no signals yet" line becomes:

- Bags branch: unchanged ("Coming soon" pill).
- Non‑bags with a signal: `Last signal · 3d ago`
- Non‑bags without a signal: existing "Last signal — no signals yet"

Pass `lastSignal` down from `Section` → `ItemCard`. `Section`/`WatchlistPage` compute it via the map above using the row's resolved slug (brand cards) or slug+model (piece cards).

## 4. Portfolio card — `src/components/portfolio/PortfolioCard.tsx`

Add optional `lastSignal: SignalRow | null` prop. Replace the current
`<Row label="Last signal" value="no signals yet" muted />` with:

- Bags: keep coming‑soon treatment consistent with Watchlist (portfolio currently shows the muted placeholder; leave the placeholder for bags per the spec — bag signals must never surface).
- Signal present: `<Row label="Last signal" value="3d ago" />`
- No signal: existing muted "no signals yet".

Portfolio rows always have a `model` field, but many portfolio pieces may not have a catalog model set. Treat any row with a non‑empty `model` as a piece (exact match required); rows with null/empty `model` match at brand level. This mirrors Watchlist's brand vs piece semantics.

`portfolio.tsx` resolves slugs per row, fetches signals, builds the map, and passes `lastSignal` to each `PortfolioCard`.

## 5. Bags guardrail

In both screens, when `row.category === "bags"`, skip signal lookup entirely and render the existing coming‑soon UI. Do not include bag slugs in the fetched slug set.

## Testable outcomes

- Brand card "Omega" → shows most recent Omega watches signal time.
- "Cartier — Watches" and "Cartier — Jewelry" show independent times sourced from `cartier-watches` vs `cartier-jewelry`.
- Piece card "Rolex Submariner" → time only if a Submariner‑specific signal exists; otherwise "no signals yet" (no fallback to a generic Rolex signal).
- Bag cards still render "Coming soon".
- Wording (`3d ago`, `2h ago`, …) matches the Signals page exactly.

## Files touched

- `src/lib/signals.ts` — add `resolveBrandSlug`, `pickLastSignal`, `fetchSignalsForSlugs`, `useSignalsForSlugs`.
- `src/routes/_authenticated/app/watchlist.tsx` — fetch signals, thread `lastSignal` into `ItemCard`, update footer.
- `src/routes/_authenticated/app/portfolio.tsx` — fetch signals, pass `lastSignal` into `PortfolioCard`.
- `src/components/portfolio/PortfolioCard.tsx` — accept `lastSignal`, render real time when present.

No DB migration, no analytics changes, no layout changes.
