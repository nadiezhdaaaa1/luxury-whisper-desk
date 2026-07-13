## V3 Onboarding — Plan

Build a fully independent V3 onboarding flow, mirroring the way V2 was added on top of V1. No V1/V2 files are modified except the Navbar (to add a V3 link) and the route tree (auto-generated).

### New files (all suffixed `V3`)

**Library**
- `src/lib/quiz-v3.ts` — copy of `quiz-v2.ts`. New localStorage key `lux_quiz_draft_v3`. Same `QuizAnswersV3` shape (categories, brands, segments, role, email).
- `src/lib/quiz-v3.functions.ts` — copy of `quiz-v2.functions.ts`, using V3 schema.

**Routes**
- `src/routes/quiz-v3.tsx` — landing quiz route (`/quiz-v3`), mirrors `quiz-v2.tsx`: quiz → email → aha reveal.
- `src/routes/_authenticated/app/quiz-v3.tsx` — in-app variant, mirrors the V2 file.

**Components (`src/components/quiz-v3/`)**
- `QuizFlowV3.tsx` — new multi-step flow orchestrator. Steps: `intro → categories → brands (one per selected category, in fixed order watches, jewelry, bags) → role`. Preserves selections when navigating back. Global 10-brand cap enforced across all category steps.
- `EmailGateV3.tsx` — reuse V2 look, imported from V2 or shallow copy for isolation. Copy for full independence.
- `AhaRevealV3.tsx` — copy of V2 aha reveal, using V3 types.
- Internal step components inside `QuizFlowV3.tsx`:
  - `StepIntroV3` — heading, subtext, brand-name marquee (grey uppercase, auto-scrolling), footer "Back to site" + "Let's go".
  - `StepCategoriesV3` — 3 large image cards (Watches / Jewelry / Bags) using existing `tabs-watches.png`, `tabs-jewelry.png`, `tabs-bags.png` assets. Multi-select. Selected = navy fill / white text. Continue disabled when empty.
  - `StepBrandPickerV3` — one instance per selected category. Header card with product image; MOST POPULAR 2-col grid (6 brands from catalog, ranked by tier then name); search input filtering full catalog for that category; selected-brand chip row; "Inferred tier" line derived from picked brands' tiers; global 10-brand-cap navy alert block (shown when total > 10) with grouped chips per category. Footer: "Skip the category" (0 in this cat) or "Continue" (≥1). Continue disabled while cap exceeded.
  - `StepRoleV3` — 3 cards (Collector / Reseller / Buyer for myself) using existing role images. Single-select, navy fill when selected. Continue disabled until pick.

**Navbar**
- `src/components/landing/Navbar.tsx` — add a `V3` link next to the existing `V2` link (desktop only, same styling).

### Behavior details

- **Segments**: derived from selected brands' catalog tiers (same rule V2 uses), driving the "Inferred tier:" line and the saved `segments` array.
- **Global cap = 10**: enforced on the union of brand picks across all three category screens. The navy alert renders inline below the picker when `total > 10`, grouped by category. Continue is disabled anywhere in the flow while over cap.
- **Skip vs Continue**: per-category footer switches based on that category's pick count.
- **Persistence**: writes `lux_quiz_draft_v3` on every change so Back preserves state; landing route redirects signed-in users to `/app`.
- **Submit**: landing flow → email gate → aha reveal (+ signup); in-app flow → `saveQuizAnswersV3` server fn → navigate to `/app`.

### Visual system

Reuse existing tokens: cream background, `text-primary` navy, `btn-primary` pill, `rounded-2xl` cards, hairline borders, `Logo` component, category icons from V2. No new colors or fonts.

### Out of scope

- No changes to V1 or V2 files, DB schema, or catalog.
- No new assets — reuse existing category, role, and brand imagery.
