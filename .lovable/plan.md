## Problem found

The watchlist seeding logic reads `profileQ.data.brands` and `profileQ.data.categories`, but `fetchMyProfile()` only selects:

```text
id, email, display_name, avatar_url, plan, quiz_completed, onboarding_completed
```

So even when quiz answers are saved correctly in the backend profile, the Watchlist page never receives `brands` or `categories`. It sees `brands = []`, marks seeding as done, and inserts nothing.

## Plan

1. Update `src/lib/profile.ts`
   - Add `segments`, `categories`, `brands`, and `role` to the `Profile` type.
   - Include those fields in the profile query selection.

2. Update `src/routes/_authenticated/app/watchlist.tsx`
   - Remove the `as any` fallback for profile preferences and use the typed fields directly.
   - Keep the existing behavior: seed only when the watchlist is empty.
   - Make the “seeded once” flag only finalize after we’ve actually evaluated loaded profile data, so a transient missing/empty profile response does not permanently skip seeding.

3. Verify
   - Confirm the watchlist plan receives profile brands/categories and would insert quiz-selected brands.
   - Check the Watchlist page no longer remains empty for a profile with saved quiz brands.