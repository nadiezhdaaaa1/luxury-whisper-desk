## Recreate the minimalist tilted watch with variable-size dots

Replace the current ornate watch in `src/components/landing/DotWatch.tsx` with the silhouette from the new reference: a tilted (~20° clockwise) round-case wristwatch with thick black straps, a chunky case ring, an empty white dial, two thin hands (hour at ~2, minute at ~5), a tiny center pin, and a small crown at ~4 o'clock. Dot size varies by region so mass reads as bigger dots and slim lines read as smaller dots.

### Approach

1. **Rasterize, don't hand-trace.** The shape is dense and asymmetric — sampling a rendered silhouette is more faithful than parametric curves.
   - Build the watch on an offscreen 480×480 `<canvas>` using vector primitives (arcs, quads, lines) at a chosen tilt angle θ ≈ 20°:
     - Two strap trapezoids (top-right and bottom-left of case), each with the tiny buckle notch visible in the reference.
     - Case ring: outer filled circle + inner white circle (donut = thick black bezel).
     - Crown: small rect on the case edge at ~4 o'clock (post-tilt).
     - Hands: two thin rectangles from center — hour short toward ~2 o'clock, minute longer toward ~5 o'clock (matching the reference pose).
     - Center pin: small filled circle.
   - Read `getImageData` once.

2. **Two-pass sampling with size classes.**
   - **Distance transform on the black mask**: for each black pixel, compute distance-to-white-edge (cheap two-pass Chamfer / simple BFS is fine at 480²).
   - **Class A – thick mass** (straps, case ring, buckle): pixels with edge-distance ≥ 4. Dot radius **2.2**, spacing target **6.0**.
   - **Class B – thin lines** (hands, crown, tick if any): pixels with edge-distance < 4 that belong to structures narrower than ~6px, OR pixels from the hands/crown layer specifically (I'll flag those at draw time by rendering hands to a separate mask). Dot radius **1.1**, spacing target **3.2**.
   - Sample each class with its own Poisson-like min-distance filter (spatial hash), so neither class overlaps in the rest state. Class A points are placed first (structural mass), then Class B fills in the finer detail without overlapping Class A.

3. **Rendering.**
   - Single `<svg viewBox="0 0 480 480">`. Each dot carries its own `r` (1.1 or 2.2), `fill="white"`, `opacity="0.2"`.
   - Same `translate` transform per circle so the magnetize loop is unchanged.

4. **Magnetize interaction — unchanged.**
   - `pointermove` → per-dot pull toward cursor, distance-scaled 4–8px, R=90, ease 0.18, spring-back on leave, `prefers-reduced-motion` respected. Overlap during hover is allowed.

5. **Layout.** No change to `FinalCTA.tsx` — the component still occupies the right column, `hidden lg:block`, max ~460px.

### Files

- Rewrite `src/components/landing/DotWatch.tsx`. No new dependencies. No other files touched.

### Notes / trade-offs

- Rasterizing on canvas means the dots run only client-side (already the case). SSR renders an empty `<svg>` shell; dots hydrate on mount.
- Distance-transform threshold of 4px cleanly separates "thick fill" (straps, case donut ~10–14px thick) from "thin strokes" (hands ~2px, crown edge ~2px).
- Expected counts: ~900 Class-A dots + ~180 Class-B dots ≈ ~1080 total — dense enough to read as a solid silhouette while staying cheap for the rAF loop.
