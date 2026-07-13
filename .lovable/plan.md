## Goal

New users still get their watchlist auto-populated from quiz answers on first
entry to the app. After that, any items they remove stay removed — including
"delete everything" — across reloads.

## Root cause

There are two independent seeders running today:

1. `useSeedWatchlistFromProfile` (app layout) — correctly seeds only once,
   using a persistent `profiles.onboarding_completed` flag set BEFORE inserts.
2. `useEffect` inside `src/routes/_authenticated/app/watchlist.tsx` — seeds
   again whenever the page loads with an empty watchlist and the profile has
   brands, with no persistent guard. This is what re-populates deleted items
   on reload.

The duplicate effect also explains the console `duplicate key … watchlist_unique_brand_per_user`
error right after bulk-removal: both seeders race on the same brands.

## Changes

1. `src/routes/_authenticated/app/watchlist.tsx`
   - Remove the page-level seeding `useEffect` (the block starting at
     "Seed once from the profile brands if the watchlist is empty").
   - Remove `seededOnce` state and the now-unused `planSeedFromProfile` and
     `insertItems` imports if nothing else in the file uses them.
   - Leave all other behavior (filters, add, remove, bulk select, target
     price, rebalance) untouched.

2. Keep `useSeedWatchlistFromProfile` as the single source of seeding. It:
   - Only runs when `quiz_completed` is true and `onboarding_completed` is
     false.
   - Flips `onboarding_completed = true` first, then seeds — so a delete
     immediately after seeding, or a page reload, never re-seeds.
   - Also sets a `pyou:onboarded:<userId>` localStorage flag as a same-session
     backup guard.

## Verification

- New user path: complete quiz -> land in app -> watchlist shows brands from
  quiz. Reload -> still shows the same items (they are now real rows).
- Delete-all path: remove every item -> reload the page -> list stays empty.
- Typecheck passes.
- Console no longer shows the `duplicate key … watchlist_unique_brand_per_user`
  error after bulk removal.