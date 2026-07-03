Add an interactive dot-based wristwatch illustration inside the FinalCTA dark navy card. Dots are white at 20% opacity and gently magnetize toward the cursor when it moves over them, then spring back to their home position.

## Where it lives
`src/components/landing/FinalCTA.tsx` — placed on the right half of the dark navy container (currently empty). Left half keeps the headline + CTA button unchanged.

## Component
New file `src/components/landing/DotWatch.tsx`:
- Renders an SVG (~420×420) with ~450–600 circle dots positioned to form a wristwatch: round case outline, inner bezel ring, 12 hour markers, hour + minute + second hands, crown on the right, and two strap segments tapering above/below the case.
- Each dot: `r=1.5`, `fill="#ffffff"`, `opacity=0.2`.
- Points are generated once (memoized) from parametric formulas (circles, line samples for hands, trapezoid samples for straps).

## Interaction
- Track pointer position via a single `pointermove` listener on the SVG (and `pointerleave` to reset).
- Use one `requestAnimationFrame` loop that updates every dot's transform each frame — no React state per dot.
- For each dot:
  - Compute distance `d` from pointer to its home position.
  - Influence radius `R = 90px`. If `d < R`, target offset = unit vector (pointer → dot) × `lerp(8, 4, d/R)` (closer = 8px pull, edge = 4px). Direction is *toward* the cursor (dot moves 4–8px toward pointer).
  - Ease current offset toward target with `offset += (target - offset) * 0.18` (spring-like return when pointer leaves — target becomes 0).
- Apply as `translate(x,y)` on each `<circle>` via direct DOM writes (`setAttribute`) to avoid React re-renders.
- `pointer-events: none` on individual dots; SVG root receives events.
- Respect `prefers-reduced-motion`: skip the RAF loop and render static dots.

## Layout change in FinalCTA
Change the inner container from `max-w-2xl` single column to a two-column grid on `lg`: text/CTA left, `<DotWatch />` right, vertically centered. On small screens, hide the watch (`hidden lg:block`) to keep the card compact.

## Files
- New: `src/components/landing/DotWatch.tsx`
- Edit: `src/components/landing/FinalCTA.tsx` (grid layout + import)

No new dependencies.