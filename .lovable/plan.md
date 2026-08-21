# Fix intermittent first-click failures

## Diagnosis

The quiz’s **“Let’s go”** button has a direct `onClick` handler with no async guard, overlay, or disabled state on the intro step. At its center, the live DOM also shows the button as the topmost pointer target.

The reproducible risk is immediately before it: the landing-page quiz CTAs use plain `<a href="/quiz">` links. That performs a full document navigation, so the server-rendered quiz button can be visible briefly before client hydration attaches `onClick`. A click in that window is lost; the second click works after hydration. This also explains why the symptom can appear after other internal full-page links.

## Implementation

1. Replace landing-page internal navigation anchors with TanStack Router `Link` components, starting with every `/quiz` CTA that can lead directly to the affected screen.
2. Convert the other same-origin route anchors in the landing navigation and footer where they currently cause unnecessary full reloads, while preserving hash-only scrolling and external links as normal anchors.
3. Preserve all existing classes, pointer-glow refs, labels, analytics handlers, destinations, and visual behavior.
4. Keep the existing press animation and edge hit-area guard; this fix addresses the separate centered-click hydration gap.

## Verification

- From the landing page, click a quiz CTA and immediately click **“Let’s go”**; confirm it advances on the first press.
- Repeat with the hero, announcement, pricing/final CTA, desktop navigation, and mobile navigation entry points.
- Confirm internal navigation no longer reloads the document and that analytics still fire once.
- Check keyboard activation and browser back navigation.
- Run the focused typecheck and inspect build/runtime logs.

## Technical details

Use `Link` from `@tanstack/react-router` with `to`/`search` props rather than raw same-origin `href` values. This keeps the already-hydrated React tree alive across navigation, eliminating the interval where visible buttons have no handlers.
