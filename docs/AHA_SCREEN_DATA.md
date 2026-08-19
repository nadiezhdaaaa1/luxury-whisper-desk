# Aha screen — data provenance

Scope: every figure rendered by `src/components/quiz-v3/AhaRevealV3.tsx` (the
post-quiz "Here's what your dashboard will track" screen). This is the
highest-trust moment in the funnel — the screen where someone decides to create
an account — so each number below is classified as **real**, **derived**, or
**invented**, with the exact work required to make it real.

| Figure | Claim | Source | Status |
| --- | --- | --- | --- |
| Indicative collection value (headline range) | "A rough estimate of what a collection in your brands is worth at typical entry prices" | `indicativeRangeV3` over `BASE_BRAND_VALUES` | **Invented inputs**, derived math |
| Per-category breakdown ("By category") | Same estimate, split per category | Same function, `perCategory` buckets | **Invented inputs**, derived math |
| Starter / Mature bar | — | Static gradient, no data | **Decorative** |
| Brand chips | The brands the user picked | User's own quiz answers | **Real** |
| Watchlist (N) | Count of picked brands | `answers.brands.length` | **Real** |
| Alerts this week | Price alerts recorded for the user's brands in the last 7 days | `public.signals` via `fetchWeeklySignalCount` | **Real when shown** (provenance-gated) |
| "How we got this" bullets | Derivation of the range | Brand count + tier lookup from `brands` catalog | **Real** (describes the derivation accurately) |

---

## 1. Indicative collection value — the biggest hardcode

`src/lib/quiz-v3.ts` contains `BASE_BRAND_VALUES`: roughly 30 hardcoded price
bands, e.g.

```ts
Rolex: { low: 12000, high: 22000 },
"Patek Philippe": { low: 45000, high: 85000 },
```

The whole headline range and the per-category breakdown rest on these numbers.
The copy is honest about being an estimate ("A rough estimate… at typical entry
prices", "Estimate based on typical entry prices — not investment advice"), but
**the numbers underneath are invented** — they were written by hand, are not
sourced from any market feed, and have never been reconciled against retail or
resale reality. Brands absent from the map fall back to a flat per-category
guess in `fallbackFor()`.

The surrounding math is genuine: tier multipliers (`TIER_MULTIPLIER`) are
applied from the real `brands.tier` catalog column, the spread is capped by
`tighten()`, and per-category buckets sum correctly. Only the base bands are
fabricated.

**To make it real:** replace `BASE_BRAND_VALUES` with a table of market-sourced
entry-price bands per brand and category — retail list price and/or observed
resale floor, with a captured-at date — and read it the way the catalog is
read, not as a module constant. Until then, do not tighten the copy: the
"rough estimate" hedging is what keeps this figure defensible.

## 2. Per-category breakdown

Purely a re-slice of §1. Same provenance, same remedy. No separate data source.

## 3. Starter / Mature bar

A static CSS gradient with two fixed labels. It encodes no data and no user
value — it is visual framing only. If it should ever mean something (e.g.
position the user's range within a distribution of real collections), that
requires an actual distribution to position against; today there is none.

## 4. Brand chips and watchlist count

Fully real. Both render the user's own quiz selections (`answers.brands`), with
the `"Name — CategoryLabel"` encoding split for display. Nothing to do.

## 5. Alerts this week — provenance-gated

Previously the literal string `12 Alerts this week`. It is now computed.

- `src/lib/signals.ts` → `fetchWeeklySignalCount(brandSlugs)` queries
  `public.signals` for rows whose `brand_slug` is in the resolved set and whose
  `signal_date` is within the last 7 days. It returns
  `{ count, allReal }`, where `allReal` is true only when **every** counted row
  has `is_sample = false`.
- The component resolves the user's encoded quiz brands to catalog slugs via
  `parseEncodedBrand` + `resolveBrandSlug`. Brands with no catalog match
  contribute nothing.
- The number renders **only** when `allReal` is true and the count is above
  zero. The gate is on provenance, not on size — there is deliberately no
  "only show it if it's impressive" threshold, because such a rule becomes
  dishonest the moment someone tunes it.
- While the query is in flight, or when the rows are sample data (the state
  today), the forward-looking line renders instead. No skeleton, no delay to
  the reveal.

### The contract the parsing work inherits

When the source parser lands and writes real rows, the count starts being shown
**with no UI change**. To flip it on:

- **Table:** `public.signals`
- **Columns that matter here:** `brand_slug` (must match `brands.slug`),
  `signal_date` (timestamp of the alert; the 7-day window is measured against
  it), `is_sample` (boolean).
- **`is_sample` means:** the row is demo/seed content, not an observed market
  event. The 424 rows currently in the table are all `is_sample = true`.
- **Switch:** rows for a user's brands within the last 7 days that all carry
  `is_sample = false`. A single sample row in the window suppresses the count
  for that user — intentionally, so a mixed window never gets presented as
  observed data. Seed data should therefore be removed or scoped away from
  brands the parser covers, not merely diluted.
- Parsers must also populate `type`, `category`, `brand_name`, `title`, `body`
  and `source_url` for the rows to be usable on `/app/signals`; the aha count
  itself only reads the three columns above.
