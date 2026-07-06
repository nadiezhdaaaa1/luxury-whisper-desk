# LuxTracker Quiz Flow — Implementation Plan

## Goal

One reusable 3-step quiz used in two contexts:
- **Landing (anonymous):** localStorage draft → email gate → aha reveal → account creation → write profile → `/app`.
- **In-app (authenticated with `quiz_completed=false`):** `/app/quiz` guard → same steps (no email gate, no account step) → write profile → `/app`.

## Shared Quiz Component

`src/components/quiz/QuizFlow.tsx` — full-screen (`min-h-[100dvh]`), premium dark/champagne theme, progress bar, per-step validation, back/next.

Steps:
1. **Segment** (multi, 1+): Luxury/Investment, Mid-market, Mass-market → `segments[]` (`luxury_invest | mid_market | mass_market`).
2. **Categories + Brands**: pick categories (Watches, Jewelry, Bags, Fashion) → searchable brand list with sensible defaults per segment/category. `categories[]` + `brands[]`. 1+ brand required.
3. **Role** (single): Collector / Reseller / Buyer for myself → `role`.

Supporting files:
- `src/lib/quiz/types.ts` — `QuizAnswers`, `QuizStep`.
- `src/lib/quiz/brands.ts` — default brand sets keyed by category with segment hints.
- `src/lib/quiz/storage.ts` — `readDraft` / `writeDraft` / `clearDraft` for `lux_quiz_draft`.
- `src/hooks/use-quiz-state.ts` — controlled state hook; landing variant syncs to localStorage, in-app variant doesn't.
- `src/components/quiz/steps/*` — one file per step, dumb-ish, receive value + onChange.
- `src/components/quiz/ProgressBar.tsx`, `QuizShell.tsx` (chrome).

Props: `{ mode: "landing" | "in-app", initial?: QuizAnswers, onComplete: (answers) => Promise<void> | void }`.

## Landing Context

- Add "Take the quiz" CTA in the landing hero (small, non-disruptive — link to `/quiz`).
- New route `src/routes/quiz.tsx` (public). Renders `QuizFlow mode="landing"`.
- After Step 3 → **EmailGate** component (zod-validated email, privacy microcopy → `/privacy`).
- After email → **AhaReveal** component: shows chosen brands, placeholder indicative value, mini dashboard mock, disclaimer, and account creation buttons.
- Account creation reuses existing auth: Google / Apple via `lovable.auth.signInWithOAuth`, plus email magic-link using the captured email (`supabase.auth.signInWithOtp`).
- After the OAuth/magic-link round-trip, a client-side handoff effect (on `/app` mount or `/auth` callback landing) detects a draft in localStorage + freshly authenticated session → writes to `profiles` → clears draft → stays on `/app`.

## In-App Context

- Route `src/routes/_authenticated/app/quiz.tsx` renders `QuizFlow mode="in-app"` with `initial` seeded from the profile (usually empty).
- Guard in `src/routes/_authenticated/app/route.tsx` (or `index.tsx` shell): fetch profile via existing helper; if `quiz_completed === false` and current path isn't `/app/quiz`, redirect to `/app/quiz`. If true, never redirect.
- On finish, write profile then navigate to `/app`.

## Profile Handoff (critical)

New server function `src/lib/quiz/quiz.functions.ts`:
- `saveQuizAnswers` with `requireSupabaseAuth` middleware — validates payload with zod, updates `profiles` row (segments, categories, brands, role, quiz_completed=true) where `id = context.userId`. Returns `{ ok: true }` or throws.

Client wrapper `saveQuizAndFinish(answers)`:
- Calls the server fn, on success: `clearDraft()`, `track("quiz_completed_saved")`, navigate to `/app`.
- On failure: surface inline error with Retry button; do NOT navigate.

Landing handoff mount effect (in `_authenticated/app/route.tsx` or a small `<QuizHandoff />` inside the layout):
- On session ready, if `readDraft()` exists and profile.quiz_completed is false, call `saveQuizAnswers(draft)`; on success clear draft. On failure show a top banner with Retry (do not silently drop).

## Analytics

Extend `src/lib/analytics.ts` event types (comment only, since it's console-based). Fire:
- `quiz_start` on QuizFlow mount.
- `quiz_step` with `{ step }` on step change.
- `email_captured` on email submit (landing).
- `aha_reveal` on aha mount.
- `account_created` on successful sign-up (already fired by existing signup but add for OAuth path too).
- `quiz_completed_saved` after successful profile write.

## Route Changes

- `src/routes/quiz.tsx` — public landing quiz (no auth).
- `src/routes/_authenticated/app/quiz.tsx` — in-app quiz.
- `src/routes/_authenticated/app/route.tsx` — add quiz-completion guard + landing draft handoff logic.
- `src/routes/_authenticated/app/index.tsx` — no-op if guard redirects.

## Technical Details

- Server fn uses existing `requireSupabaseAuth` pattern; RLS already allows users to update their own profile.
- Zod schemas: `segmentEnum`, `categoryEnum`, `roleEnum`, `quizAnswersSchema`.
- LocalStorage key exactly `lux_quiz_draft` as JSON `{ segments, categories, brands, role, email? }`.
- Full-screen shell uses `min-h-[100dvh] flex flex-col` with a sticky top progress bar and sticky bottom action row — no layout jump between steps (reserve min-height on content area).
- Brand search: local filter over static default list + `+ Add "<query>"` chip to append arbitrary brand strings.
- Aha "indicative value": deterministic placeholder from brand list (e.g. `brands.length * 4500`) with disclaimer.
- No new tables; only writes to existing `profiles`.
- Reuse existing auth pages? For landing, the aha screen shows OAuth buttons + "Continue with email"; email path calls `signInWithOtp({ email, options: { emailRedirectTo: origin + '/app' } })` then shows "Check your inbox".

## Out of Scope

Real dashboard content, portfolio/signals data, billing, onboarding "add first item", analytics vendors.

## Testable Outcomes

1. Stranger → `/quiz` → complete 3 steps → email gate → aha → sign up → `/app` shows profile populated, `lux_quiz_draft` gone.
2. Direct sign-up → `/app` auto-redirects to `/app/quiz` → complete → `/app` never asks again.
