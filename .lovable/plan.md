## Recreate the reference watch as a dense dot portrait

Rework `src/components/landing/DotWatch.tsx` to visually match the uploaded vintage wristwatch (round case, fluted bezel with tick blocks, Roman numerals I–XII, inner minute track, exposed skeleton gears, ornate hour/minute hands, thin second hand, crown at 3 o'clock, lugs + tapered straps with stitching highlights).

### Approach

1. **Trace the reference as vector paths/shapes** (all done in code, no image import):
   - Outer case ring, inner bezel ring with rectangular tick blocks
   - Roman-numeral ring (12 glyphs) + tiny circle markers between them
   - Inner minute track (fine ticks)
   - Central skeleton area: concentric arcs + gear circles (approximated with rings and small toothed circles) occupying the lower half of the dial
   - Two ornate hands (leaf-shaped) at ~10:10, thin second hand
   - Crown (small rectangle with vertical striations) at 3 o'clock
   - Top and bottom straps with lug shapes and a few stitch highlight strokes

2. **Sample all shapes into a single point cloud** using stroke-following + area fills:
   - For each stroke (rings, arcs, ticks, hands, strap outlines): walk the path and emit points at a fixed arc-length spacing.
   - For Roman numerals: render each glyph to an offscreen canvas, read pixels, emit a point per filled cell on a grid.
   - Target ~1600–2200 dots total (up from ~480).

3. **Enforce non-overlap in the rest state** via Poisson-like spacing:
   - Minimum spacing = `2 * r + gap` (e.g. r=1.4, gap=1.2 → min dist ~4px).
   - When sampling, reject a candidate point if it's within min-dist of any accepted point (spatial hash grid for O(n)).
   - This guarantees dots never touch at rest, matching the request.

4. **Magnetization unchanged in spirit, tuned for density**:
   - Same `pointermove` + rAF loop, `Float32Array` offsets/targets.
   - Radius R=90, pull 4–8px toward cursor (closer = stronger).
   - Overlap during hover is allowed and expected — no collision resolution while animating.
   - Spring-back easing 0.18, `prefers-reduced-motion` respected.

5. **Rendering**:
   - Single `<svg viewBox="0 0 480 480">`, one `<circle>` per point, `fill="white"`, `fill-opacity="0.2"`, `r="1.4"`.
   - `pointer-events: none` on circles; listener on the SVG root.
   - Container sized responsively (max ~460px), still `hidden lg:block` on the right column of `FinalCTA`.

### Files

- Edit `src/components/landing/DotWatch.tsx` — replace the current geometry + sampler with the reference-matched builder and Poisson spacing.
- No changes to `FinalCTA.tsx`, no new deps.

### Notes / trade-offs

- The gear cluster and ornate hands are approximated (rings + small circles + leaf outlines), not pixel-perfect engravings — dot art naturally abstracts fine detail, and denser sampling carries the silhouette.
- With ~2000 dots the rAF loop stays cheap because each dot is 2 `setAttribute` writes per frame; still well within budget on mid-range laptops.
