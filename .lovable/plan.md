## Goal
Make the V3 quiz the only quiz in the app. Public `/quiz` and in-app `/app/quiz` both render the current V3 experience. All `-v2` and `-v3` URL variants and their duplicate code are removed.

## Routing changes
- Public route `src/routes/quiz.tsx` → render `QuizFlowV3` (the current V3 landing quiz).
- In-app route `src/routes/_authenticated/app/quiz.tsx` → render `QuizFlowV3` and call `saveQuizAnswersV3` (matches current `/app/quiz-v3` behavior).
- Delete route files:
  - `src/routes/quiz-v2.tsx`
  - `src/routes/quiz-v3.tsx`
  - `src/routes/_authenticated/app/quiz-v2.tsx`
  - `src/routes/_authenticated/app/quiz-v3.tsx`
- `src/routeTree.gen.ts` regenerates automatically.
- `src/routes/sitemap[.]xml.tsx` already lists only `/quiz` — no change.

## Navbar / landing links
- `src/components/landing/Navbar.tsx`: remove the `/quiz-v2` and `/quiz-v3` links; keep only the "Get started" → `/quiz` CTA.
- `Hero.tsx`, `FinalCTA.tsx`, `AnnouncementBar.tsx`, `Pricing.tsx` already point at `/quiz` — no change.

## Code deletions
- `src/components/quiz/` (v1 `QuizFlow`, `AhaReveal`, `EmailGate`)
- `src/components/quiz-v2/` (entire folder)
- `src/lib/quiz-v2.ts`, `src/lib/quiz-v2.functions.ts`
- `src/lib/quiz.functions.ts` (v1 server functions no longer referenced)

## Kept intentionally
- `src/lib/quiz.ts` stays. It exports shared types and catalog data (`CATEGORIES`, `CATEGORY_LABELS`, `BRAND_CATALOG`, `Category`, tier resolvers) consumed by portfolio, watchlist, signals, dashboard, and modals. It is not the quiz UI — removing it would require a large refactor across unrelated features. V3's own `src/lib/quiz-v3.ts` continues to drive the V3 flow.

## Verification
- Typecheck.
- Confirm no remaining references to `quiz-v2`, `quiz-v3`, `QuizFlowV2`, or the deleted v1 components.
- Load `/quiz` and `/app/quiz` in preview and confirm V3 renders.

## Open question
Do you also want the internal file/symbol names cleaned up (rename `QuizFlowV3` → `QuizFlow`, `quiz-v3.ts` → merge into `quiz.ts`, etc.)? That's a larger rename touching the shared `quiz.ts` types used across the app. My default is **no** — keep the V3 filenames/exports as-is so the shared catalog in `quiz.ts` stays untouched. Say the word if you want the full rename.
