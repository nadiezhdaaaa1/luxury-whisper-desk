## Problem

In the "Affected" section under each signal card on `/app/signals`, watchlist entries currently include brand-level bookmarks (e.g. "Seiko"). These should not appear — brand-level watchlist entries only determine *which* signals surface, not what is affected. Only concrete pieces (from watchlist and/or portfolio) belong in the affected list.

## Fix

In `src/routes/_authenticated/app/signals.tsx`, inside `buildCardData`, restrict `wlMatches` to piece-type watchlist rows only:

- Add a filter `x.row.type === "piece"` before the model check.
- Remove the `if (x.row.type === "brand") return true;` shortcut so brand-only watchlist rows are never included as affected items.

Result:
- Brand-level signals: affected = all portfolio pieces of that brand + all watchlist *pieces* of that brand.
- Piece-level signals: affected = matching portfolio pieces + matching watchlist pieces.
- Brand-only watchlist entries continue to drive signal subscription via `followedBrands`, but no longer render as chips or inflate the "N watchlist pieces" count.

Also update the `affectsFilter === "watchlist"` filter (line 165) — it keeps working correctly since `watchlistMatches` will now only contain pieces.

No changes needed in `ImportantSignalCard.tsx`; the `WatchlistChip` brand-only branch simply becomes dead code paths that no longer receive brand rows.

## Files

- `src/routes/_authenticated/app/signals.tsx` — tighten `wlMatches` filter in `buildCardData`.
