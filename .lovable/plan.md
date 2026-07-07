## Extend the design-system pass

Building on the quiz restyle already in flight, bring the remaining surfaces in line with the same visual language (centered `LUXTRACKER` header + hairline chrome, `font-display` typography, `rounded-2xl` cards on `bg-surface`, `border-hairline`, `btn-primary` / ghost buttons, muted-foreground subtitles, generous `max-w-3xl` gutters).

### 1. AhaReveal (final quiz screen) — `src/components/quiz/AhaReveal.tsx`
- Sticky header shell identical to `QuizFlow` / `EmailGate`: centered wordmark, `bg-background/90 backdrop-blur`, 3-step progress bar with all three segments filled.
- Bump container to `max-w-3xl` and match quiz vertical rhythm.
- Replace the inline `Sparkles / h1 / subtitle` block with the shared `StepHeader` pattern (either export `StepHeader` from `QuizFlow.tsx` or mirror the markup).
- Add the standard footer row: "Back to site" (→ `/`) on the left, "Back" (→ email step) on the right. Requires a new optional `onBack` prop and wiring `onBack={() => setPhase("email")}` from `src/routes/quiz.tsx`.
- Auth logic, analytics, and card copy stay unchanged.

### 2. Popups / modals
Audit turned up two live popup surfaces (no toasts, sheets, popovers, drawers currently in use):

- **`AlertDialog` in `src/components/quiz/QuizFlow.tsx`** ("Leave quiz" confirm) — restyle content to match: `rounded-2xl`, `border-hairline`, `bg-surface`, `font-display` title, muted subtitle, `btn-primary` for the destructive confirm and hairline ghost for cancel. Keep radix behavior untouched.
- **`src/components/consent/PreferencesModal.tsx`** and **`src/components/consent/CookieBanner.tsx`** — swap ad-hoc borders/shadows for `border-hairline` + `bg-surface`, apply `font-display` to headings, `btn-primary` for the primary CTA, and hairline ghost buttons for secondary actions. Preserve consent logic and copy.

### 3. Authenticated app screens
- **`src/components/app/DashboardShell.tsx`** — align top bar wordmark with the quiz header (`LUXTRACKER` treatment, hairline bottom border, `bg-background/90 backdrop-blur`), convert nav links to `font-display` with `text-muted-foreground` / primary active state, and normalize the outer container to `max-w-6xl` with the same page padding rhythm.
- **`src/components/app/EmptyState.tsx`** — `rounded-2xl border border-hairline bg-surface`, `font-display` heading, muted subtitle, `btn-primary` CTA.
- **`src/routes/_authenticated/app/index.tsx`**, **`portfolio.tsx`**, **`signals.tsx`**, **`watchlist.tsx`** — each currently a minimal placeholder; give them a consistent page header (eyebrow + `font-display` title + muted subtitle, mirroring `StepHeader`) and wrap content in `rounded-2xl border-hairline bg-surface` cards. No new business logic.
- **`src/routes/_authenticated/app/settings.tsx`** — restyle sections into hairline cards, `font-display` section titles, hairline inputs, `btn-primary` save button. Keep existing form fields and handlers.
- **`src/routes/_authenticated/app/quiz.tsx`** — inline error toast already lives here; restyle to `rounded-2xl border-hairline bg-surface` with destructive accent text and a `btn-primary` retry, matching the rest.

### 4. 404 page — `src/routes/__root.tsx` (`NotFoundComponent`)
- Change the "404" numeral to `120px` (`text-[120px]`) `font-display` with tight leading. Keep the subtitle, description, and "Go home" button, but restyle button to `btn-primary` / hairline ghost pair used elsewhere.
- Wrap the page in a centered container with the same background as the landing.
- Add the hero-section polka-dot cursor interaction:
  - Extract the current inline `HeroDotField` component in `src/components/landing/HeroDotField.tsx` — it already renders a dot field masked by a radial gradient that follows the cursor, with `--edge` opacity ramping up as the cursor approaches a target panel.
  - Refactor lightly so it accepts either the existing `panelRef` (used by Hero) or works with a single `containerRef` where the "panel" is the container itself. Simplest path: add an optional `panelRef` — when omitted, use `containerRef` as the panel — so the dot field always follows the cursor across the 404 viewport and stays visible while over the content card.
  - Mount `HeroDotField` inside the 404 layout with a `containerRef` on the outer wrapper and a `panelRef` on the inner card that holds "404" + copy. Preserve reduced-motion / touch-device short-circuits already in the component.
  - No changes to `Hero.tsx` behavior; existing call site keeps working.

### Out of scope
- No route restructuring, no new auth flows, no copy rewrites beyond header/subtitle alignment.
- No design-token changes in `src/styles.css` unless a missing token is discovered during implementation (in which case add it as a small addendum).
