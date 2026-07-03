## Changes to `src/components/landing/DotWatch.tsx`

**1. Shift watch 48px right**
Wrap the SVG in a container with `translate-x-[48px]`, or add `ml-12` to the SVG. Simplest: change the SVG's className to include `translate-x-12` (12 × 4px = 48px).

**2. Add proximity-based scaling on hover**
Extend the existing RAF loop so each dot also animates a scale value alongside its translate offset:

- Same influence radius `R = 90px` as magnetization.
- Scale target: `1 + 0.10 * (1 - d/R)` when `d < R` (closer = larger, max +10% at `d=0`), else `1`.
- Ease scale with the same `EASE = 0.18` for smooth spring-back.
- Store scales in a new `Float32Array(homes.length)` (`scalesRef`).
- Apply as `transform="translate(ox oy) scale(s)"` on each `<circle>`. Because scale is applied after translate on the same element, the dot scales around its own `(cx, cy)` — which is what we want (the dot grows in place, magnetization already handles the pull toward the cursor).

**3. Reduced-motion path**
Keeps static dots (no scale, no translate) — unchanged.

## Files
- Edit: `src/components/landing/DotWatch.tsx` (className shift + scale state + transform string update)

No new dependencies, no layout changes elsewhere.