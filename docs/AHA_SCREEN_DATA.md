# Aha screen — data provenance

Scope: every figure rendered by `src/components/quiz-v3/AhaRevealV3.tsx` (the
post-quiz "Here's what your dashboard will track" screen). This is the
highest-trust moment in the funnel — the screen where someone decides to create
an account — so each number below is classified as **real**, **derived**, or
**invented**, with the exact work required to make it real.

| Figure                                         | Claim                                                                         | Source                                                                       | Status                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Indicative collection value (headline range)   | —                                                                             | —                                                                            | **REMOVED from the screen**   |
| Per-category breakdown ("By category")         | —                                                                             | —                                                                            | **REMOVED from the screen**   |
| Starter / Mature bar                           | —                                                                             | —                                                                            | **REMOVED from the screen**   |
| Brand chips / "Selected brands (N)" disclosure | —                                                                             | —                                                                            | **REMOVED from the screen**   |
| Example alerts (up to 3 cards)                 | "Sample alerts based on recent activity for these brands — not live results." | `public.signals` via `getExampleAlerts` (anon server fn, `is_sample = true`) | **Real rows, sample content** |
| Coverage line                                  | How many picked brands PriceYou tracks                                        | `brands` catalog via `parseEncodedBrand` + `resolveBrandSlug`                | **Real**                      |

The portfolio-valuation feature is not in launch scope, so the valuation
preview (range, per-category split, maturity bar) and the redundant brand chip
list were deleted from the screen along with their supporting code in
`src/lib/quiz-v3.ts`.

---

## 1-4. Removed figures

The indicative collection value, the per-category breakdown, the Starter /
Mature bar and the brand chip list no longer render. `BASE_BRAND_VALUES`, the
tier multipliers, the spread-tightening helper, the per-category bucket math,
`indicativeRangeV3`, `formatCompactUSDV3` and `personalizationLineV3` were
deleted; nothing on any surface derives a collection value any more.

## 5. Example alerts panel

Current copy on the screen:

- Eyebrow: `YOUR BRANDS`
- Headline: `Here's what you'd have known`
- Sub-paragraph, public mode: `Recent activity on the brands you picked. Create
your account and you'll hear it as it happens.`
- Sub-paragraph, in-app mode: `Recent activity on the brands you picked. Your
answers are saved.`
- Panel header: an `Example alerts` pill on the left, the coverage line on the
  right. Below it, at most three `ExampleAlertCard`s.

The former caption under the cards ("Sample alerts based on recent activity for
these brands, not live results") was removed: the conditional-past headline plus
the `EXAMPLE ALERTS` pill directly above the cards already establish that the
cards are illustrative, and the screen was hedging four times over.

- **Source:** `public.signals`, read by `getExampleAlerts` in
  `src/lib/aha-signals.functions.ts` — an anon-callable `createServerFn` with
  no auth middleware, using `supabaseAdmin` (service credentials) because the
  table's only SELECT policy is scoped to `authenticated`.
- **`is_sample = true` is mandatory.** Returning real signals would let an
  anonymous caller detect whether the product has observed market data yet.
  The sample-only filter closes that oracle and must not be removed.
- **At most 3 rows, type-diversified:** at most one row per `type` first, then
  the most recent remaining rows fill any shortfall, so the cards demonstrate
  three different capabilities rather than repeating one.
- **Deterministic ordering:** `signal_date` desc with a stable `id` tiebreak,
  so SSR and client hydration agree. No randomness.
- **No dates rendered, ever.** The sample rows are weeks old; a dated card
  would read as a stale live feed. `signal_date` and `is_sample` are not in the
  response shape at all.
- **No `source_url`.** The function returns a derived `source_host` hostname,
  rendered as plain text; the card is entirely non-interactive.

## 5b. Coverage line

Real, anon-readable data: how many of the user's picked brands exist in the
`brands` catalog, resolved with `parseEncodedBrand` + `resolveBrandSlug`.

- Full coverage: `All {total} covered`
- Partial coverage: `{tracked} of {total} covered`
- Catalog in flight / no brands: nothing renders in the slot

### Why not a `SECURITY DEFINER` aggregate

The alternative was an RPC returning only `{ count, all_real }` for a set of
brand slugs. Rejected, and still rejected: its `all_real` flag would let any anonymous
caller determine whether the product has observed market data yet — a cheap
oracle on the state of the business.

What was accepted instead, as the deliberate access decision this doc asked
for, is a **sample-only content read**: `getExampleAlerts` serves rows filtered
to `is_sample = true` through service credentials. It exposes no realness flag
and no count of real data, so the oracle stays closed. RLS on `public.signals`
is unchanged — no policy was added or loosened.

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
