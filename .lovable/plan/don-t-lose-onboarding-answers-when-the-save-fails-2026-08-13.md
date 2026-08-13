# Don't lose onboarding answers when the save fails

## Problem

On the landing quiz's final screen (`AhaRevealV3`), after the account is created the app tries to write the quiz answers into the profile. If that call fails, the failure is only written to the browser console and the user is redirected into `/app` anyway. The dashboard then loads with no categories, brands, or role, and the user is never told anything went wrong.

There is a partial safety net today: the `/app` layout re-attempts the save from the saved draft in local storage and shows a thin banner on failure. But it only helps when the draft is still readable, and the banner is easy to miss — the user has already been dropped into an empty dashboard.

## What to change

1. **Retry before giving up.** Attempt the save up to 3 times with a short increasing delay (roughly 0.5s / 1.5s) before treating it as failed. Most failures here are transient network blips right after sign-up.

2. **Stop the silent redirect.** If all attempts fail, stay on the reveal screen instead of navigating to `/app`. Show a clear message in the existing error area:
   "We couldn't save your preferences. Your answers are saved on this device — try again."
   with two actions:
   - **Try again** — re-runs the save, then continues to the dashboard on success.
   - **Continue anyway** — proceeds to `/app` for users who just want in (the draft stays on the device so the dashboard can still recover it).

3. **Keep the draft intact.** The local draft is only cleared after a confirmed successful save — this already holds and must stay that way.

4. **Make the dashboard fallback visible.** In the `/app` layout, replace the thin top strip with a proper dismissible alert that explains the situation ("Your onboarding answers haven't been saved yet") and offers **Retry** plus a link to redo the quick setup at `/app/quiz`. Also handle the case where the draft is gone: if the profile has no quiz answers and no draft exists, the existing guard already routes the user to `/app/quiz`, so no data is silently lost.

## Technical notes

- `src/components/quiz-v3/AhaRevealV3.tsx`: rework `persistAndGoToApp()` into a retrying save that returns success/failure; callers (`googleSignup`, OTP verify) only navigate on success. Add a `saveFailed` state driving the retry / continue-anyway UI reusing the existing `error` block styling.
- `src/routes/_authenticated/app/route.tsx`: upgrade the `handoffError` banner to a clearer alert with Retry and a "Redo setup" link; keep the existing `handoffRan` retry-gating logic.
- No backend, schema, or `saveQuizAnswersV3` changes — the server function already throws a real error message.
