# Auth + Quiz Flow Fixes

## 1. Email OTP on aha-reveal (replace magic link)

Edit `src/components/quiz/AhaReveal.tsx`:

- Replace `emailMagicLink()` with two-step OTP flow:
  - **Step A — send code**: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: undefined } })`. This sends a 6-digit code (no magic link) as long as no `emailRedirectTo` is passed.
  - **Step B — verify code**: `supabase.auth.verifyOtp({ email, token: code, type: "email" })`. On success the session is set; redirect to `/app` — the existing `AppLayout` handoff writes the quiz draft to the profile and clears local draft.
- UI states: `idle → sending → awaiting_code → verifying → error`.
  - 6-digit input (numeric, `inputMode="numeric"`, autofocus, one-time-code autocomplete).
  - Inline errors for invalid/expired code (map Supabase error messages to friendly text).
  - "Resend code" button with 30-second cooldown countdown; re-sends via `signInWithOtp`.
  - "Change email" link that returns to the email step (calls existing `onBack`).
- Google button stays; both paths share the same success target (`/app`).
- Analytics: `otp_code_sent`, `otp_verified`, `otp_verify_failed`.

## 2. Direct-signup quiz guard (Path B fix)

Two problems to address:

### a. Ensure `profiles` row exists with `quiz_completed = false`

Check the `handle_new_user()` trigger inserts a row on every `auth.users` insert (Google + email). The current function inserts on conflict do nothing — `quiz_completed` column default should be `false`. Confirm via migration only if defaults are wrong; otherwise no schema change.

Also make `fetchMyProfile()` resilient: if `profiles` row is missing for the current user (edge case), insert a minimal row before returning, so the guard has data to read.

### b. Repair the /app guard

Rewrite the guard in `src/routes/_authenticated/app/route.tsx` so it runs on **every** entry, in this order:

1. Not authenticated → handled by `_authenticated/route.tsx` (already redirects to `/login`).
2. Profile still loading → render nothing (spinner).
3. `quiz_completed === false`:
   - If a complete landing draft exists → run handoff (existing logic), which flips `quiz_completed = true`.
   - Else if pathname !== `/app/quiz` → `navigate({ to: "/app/quiz", replace: true })`.
4. `quiz_completed === true && onboarding_completed === false` and pathname !== `/app/onboarding` → redirect there (only if that route exists; otherwise skip).
5. Else → render dashboard.

Also, in `src/routes/_authenticated/app/quiz.tsx`, keep the existing "redirect to /app when already completed" effect so a completed user can never re-enter the quiz.

## 3. Testing checklist

- Landing quiz → aha → enter email → receive 6-digit code → verify → land in /app with quiz data saved. Wrong code shows inline error; resend works after cooldown.
- Google button on aha → OAuth → back to /app → draft handoff writes quiz answers.
- Brand-new direct signup at `/signup` (no landing) → after email confirm → /app → immediately redirected to `/app/quiz` → complete → dashboard → sign out → sign back in → straight to dashboard, no quiz re-prompt.

## Technical notes

- Supabase `signInWithOtp` sends a magic link **and** a 6-digit code by default; omitting `emailRedirectTo` still sends the code. We verify with `type: "email"`.
- The email template must include `{{ .Token }}`. If templates only render `{{ .ConfirmationURL }}`, users won't see the code. Flag this to the user as a one-time Cloud → Emails template check; we'll build the flow assuming `{{ .Token }}` is present, per the spec's note.
- No new tables. No schema migration expected unless `profiles.quiz_completed` default is wrong (will verify before touching).

## Files touched

- `src/components/quiz/AhaReveal.tsx` — OTP UI + verify flow.
- `src/routes/_authenticated/app/route.tsx` — guard rewrite.
- `src/lib/profile.ts` — self-heal missing profile row (small addition).
- `src/lib/analytics.ts` — add new event names to the union.
