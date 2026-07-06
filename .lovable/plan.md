## Problem

When clicking a footer legal link, the sequence is: landing page snaps to top → briefly visible → legal page mounts. That "landing at top" flash is what feels jumpy.

Root cause: the router's `scrollRestoration` scrolls the current (landing) page to the top before the new route commits, so the top of the landing renders for a paint before being replaced.

## Fix

Mask the transition with a blank frame so the user never sees the outgoing page reset to top.

In `src/routes/__root.tsx`:

1. Track `pathname` changes with `useRouterState`.
2. On change, set a `transitioning` flag to `true` (via `useLayoutEffect`, before paint).
3. While `transitioning` is `true`, render a plain `<div className="min-h-screen bg-background" />` instead of `<Outlet />`. That gives the user a solid background-colored blank screen — no landing content, no legal content.
4. In a `useEffect` (after commit), scroll to `(0, 0)` instantly and clear the flag on the next animation frame so the new route paints already-scrolled-to-top.

Net effect on click: landing → 1 blank frame at scroll top → legal page at top. No visible landing reset, no scroll movement.

Nothing else changes — `scroll-behavior: auto`, `scrollRestoration`, and existing route/head metadata stay as they are. Applies globally to every route transition, so the same smoothing benefits any future page navigations too.

## Files touched

- `src/routes/__root.tsx` — replace the current pathname `useEffect` scroll block with the transitioning-flag pattern; conditionally render blank vs `<Outlet />`.
