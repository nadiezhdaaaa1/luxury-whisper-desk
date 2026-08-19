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
| Brand coverage line | How many picked brands PriceYou tracks | `brands` catalog via `parseEncodedBrand` + `resolveBrandSlug` | **Real** |
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

## 5. Brand coverage line (replaces the old "alerts this week")

The screen previously carried a literal `12 Alerts this week`, then a computed
signals count. Both are gone. The aha screen is phase `"aha"` of the landing
quiz — after the email gate, **before** account creation — so the viewer is
always unauthenticated.

`public.signals` has RLS enabled and a single SELECT policy scoped to
`authenticated`. An anonymous caller therefore gets `200 []`, not an error: a
broken query and "no data yet" are indistinguishable from the client. A
signal-derived count on this surface can never become real, no matter what the
parser writes.

What renders instead is real, anon-readable data: how many of the user's picked
brands exist in the `brands` catalog. The component resolves the encoded quiz
brands (`"Name — CategoryLabel"`) with `parseEncodedBrand` + `resolveBrandSlug`;
the count is how many resolved. Brands the user typed that PriceYou does not
cover simply don't resolve, and the partial state says so rather than rounding
up. While the catalog query is in flight, the forward-looking line renders
alone — no skeleton, no delay to the reveal.

Exact strings (all in the same `text-xs uppercase tracking-widest
text-muted-foreground` slot, so no layout shift between states):

- Full coverage: `All {n} brands covered — we'll track price alerts for them`
- Partial coverage: `{tracked} of {total} brands covered — we'll track price alerts for them`
- In flight / no brands: `We'll track price alerts for these brands`

### Why not a `SECURITY DEFINER` aggregate

The alternative was an RPC returning only `{ count, all_real }` for a set of
brand slugs. Rejected: its `all_real` flag would let any anonymous caller
determine whether the product has observed market data yet — a cheap oracle on
the state of the business — and that was judged not worth buying a number the
coverage line already covers honestly. `signals` stays authenticated-only.

## 6. Where the alerts count does belong

Authenticated surfaces, which already read the table correctly:

- `/app/signals` — the feed, via `useSignals` in `src/lib/signals.ts`
  (mute-filtered before counting).
- The dashboard counters on `/app`, derived from the same hook.

Both run with a session, so RLS returns rows and the numbers are whatever is in
the table — sample rows included, today.

## 7. What the parsing work must populate, and how to verify it

- **Table:** `public.signals`
- **Required columns:** `brand_slug` (must match `brands.slug`), `signal_date`,
  `type`, `category`, `brand_name`, `title`, `body`, `source_url`, and
  `is_sample`.
- **`is_sample` means:** the row is demo/seed content, not an observed market
  event. All rows in the table are currently sample data.

Verify against the **database**, not the screen — the UI cannot distinguish a
broken query from an empty result, so "look at it" is not a test.

```sql
-- What the table holds today (all rows are currently is_sample = true):
select is_sample, count(*) from public.signals group by is_sample;

-- Real rows landing in the last 7 days, per brand:
select brand_slug, count(*)
from public.signals
where is_sample = false
  and signal_date >= now() - interval '7 days'
group by brand_slug
order by 2 desc;

-- Rows a parser wrote but that no catalog brand matches (these are invisible
-- in the app):
select s.brand_slug, count(*)
from public.signals s
left join public.brands b on b.slug = s.brand_slug
where b.slug is null
group by s.brand_slug;
```

**RLS fact to carry forward:** `public.signals` is SELECT-able by
`authenticated` only. If anyone later wants signal data on a pre-auth surface,
that requires an explicit, deliberate access decision (a scoped aggregate RPC or
an anon policy) — not a client-side query, which will silently return nothing.

