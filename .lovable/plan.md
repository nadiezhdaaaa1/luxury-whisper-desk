# Populate Price alerts with sample entries

## What's happening now

The alerts table already holds 424 sample alerts, but every one of them is dated between May 9 and July 8, 2026. Today is August 13, so the page's default "Month" time filter hides all of them — the list looks empty even though data exists. On top of that, alerts are only shown for brands in your Brand watchlist, so an empty watchlist also produces an empty list.

## The fix

1. Move the existing sample alerts into a recent window: spread all 424 alerts across the last 30 days (most within the last 7–10 days, so "Week" and "Month" both show results). Keep their relative order and variety of types (price increase, new collection, discount, drop).
2. Make sure the signed-in account's watchlist has brands that actually have alerts. If your watchlist is empty, add a small starter set (e.g. Rolex, Hermès, Cartier, Louis Vuitton) so the feed, filters, and grouping-by-day all render.
3. Verify in the preview: open /app/signals, confirm the list renders with day groups (Today / Yesterday / dates), and that the type, category, brand, and timeline filters all return results.

## Technical notes

- Data-only change via an update to `public.signals.signal_date` (no schema change, no code change).
- Watchlist rows inserted for the current user id only, matching brand names/categories in the `brands` catalog so `resolveBrandSlugs` can map them to alert `brand_slug` values.
- Dashboard counters ("Total price alerts", "Latest price alerts") read from the same query, so they will populate too.
