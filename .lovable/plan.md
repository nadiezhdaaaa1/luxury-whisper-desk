# Watchlist quiz seeding fix

## Problem

The quiz stores each selected brand as an encoded string `"${brand} — ${CategoryLabel}"` (e.g. `"Rolex — Watches"`, `"Van Cleef & Arpels — Jewelry"`). This is done in `src/components/quiz/QuizFlow.tsx` so deselecting a category cleanly clears its brands.

The watchlist seeder in `src/lib/watchlist.ts` → `planSeedFromProfile` compares those encoded strings against raw catalog names:

```ts
if (!profileBrands.includes(entry.name)) continue; // entry.name = "Rolex", profile has "Rolex — Watches"
```

Nothing ever matches, so no brands get inserted into the watchlist on first load — the "seed from quiz" flow silently does nothing.

Verified against DB: profiles contain values like `"Van Cleef & Arpels — Jewelry"`, `"Rolex — Watches"`. One legacy profile has bare names (`"Rolex"`) — the fix should keep supporting those too.

## Fix

Update `planSeedFromProfile` in `src/lib/watchlist.ts` to normalize each profile brand entry before matching:

- Split on the ` — ` separator; the left side is the brand name, the right (optional) is the category label.
- For each category in `CATEGORIES` that the user picked, iterate `BRAND_CATALOG[c]` and match when the decoded brand name equals `entry.name` AND (the decoded category label is missing OR equals `CATEGORY_LABELS[c]`). The category-label check prevents a "Cartier — Jewelry" pick from also seeding the Watches Cartier brand row.
- Keep the existing dedupe (`${c}::${entry.name}`), ordering, and active-cap slicing.

No schema changes, no UI changes, no changes to how the quiz saves data. Existing seeded watchlists are unaffected because `WatchlistPage` only seeds when the watchlist is empty.

## Verification

- Reload `/app/watchlist` as an affected user with an empty watchlist → brand cards appear for each quiz-selected brand, respecting the free-tier active cap (first 3 Active, rest Paused).
- Legacy profile with bare brand names still seeds correctly.
- Typecheck passes.
