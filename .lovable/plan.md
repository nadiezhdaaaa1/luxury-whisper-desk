## Goal
Replace the Damascus steel raster image in the hero background with a lightweight SVG vector pattern using black lines at 4% opacity, layered over the previous light hero background color.

## Changes

### 1. `src/components/landing/Hero.tsx`
- Remove the `damascusTexture` import and the `<img>` layer that renders it.
- Remove the light gradient overlay that was compensating for the dark texture.
- Replace the background stack with:
  - The original light hero background (solid `bg-background` / ivory token that was in place before the texture was introduced).
  - A single absolutely-positioned SVG layer on top of it (still behind hero content) containing an inline `<pattern>` of Damascus-style flowing/swirled lines, stroked in `#000` at `opacity: 0.04`, tiled across the full hero.
  - Keep `pointer-events-none` and correct z-index so content stays interactive and above the pattern.

### 2. `src/assets/damascus-steel.jpg` + its `.asset.json`
- Delete via `lovable-assets delete` since it is no longer referenced.

## Vector pattern approach
Inline SVG (no new file) with a `<pattern>` tile roughly 220×220px containing 6–10 overlapping wavy `<path>` curves that mimic the flowing bands of Damascus steel. All strokes: `stroke="#000"`, `stroke-opacity="0.04"`, `stroke-width` between 0.75 and 1.25, `fill="none"`, with `stroke-linecap="round"`. The pattern tiles seamlessly so no seam is visible across the hero width.

## Out of scope
- Bento cards, typography, other sections — untouched.
