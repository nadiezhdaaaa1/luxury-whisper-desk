## Goal

Break up the strict diagonal banding in `ParticleField.tsx` so the density ripple feels like natural, wind-driven waves — still calm and premium, just less geometric.

## Changes (single file: `src/components/landing/ParticleField.tsx`)

Keep the dots on their strict grid. Only the **intensity function** changes.

1. **Curve the wavefronts (no more straight diagonals)**
   Replace the linear `gx + gy` and `gx - gy` phase terms with slightly warped versions so crests bend across the field:
   ```
   const u = p.gx + p.gy + 1.8 * Math.sin(p.gy * 0.18 + t * 0.15);
   const v = p.gx - p.gy + 1.6 * Math.sin(p.gx * 0.16 - t * 0.12);
   const wave1 = 0.5 + 0.5 * Math.sin(u * 0.32 - t * 0.55);
   const wave2 = 0.5 + 0.5 * Math.sin(v * 0.20 + t * 0.33);
   ```
   The sine-of-sine warp is what turns straight bands into curved, swell-like fronts.

2. **Add a third, low-frequency swell at an off-angle**
   Gives large slow "gusts" that drift across the whole grid so no two moments look alike:
   ```
   const wave3 = 0.5 + 0.5 * Math.sin(
     (p.gx * 0.09 + p.gy * 0.13) + t * 0.18
   );
   ```

3. **Recombine with weights that still favor the main wave**
   ```
   let intensity = 0.5 * wave1 + 0.3 * wave2 + 0.2 * wave3;
   ```

4. **Soft contrast curve so peaks feel like crests, troughs feel like lulls**
   Apply a gentle S-curve (`smoothstep`) instead of a hard remap:
   ```
   intensity = intensity * intensity * (3 - 2 * intensity);
   ```
   Keeps the same 0–1 range but concentrates brightness into rolling bands with quieter valleys between — that's what reads as "natural."

5. **Keep everything else identical**
   Grid spacing, base alpha/radius, left-edge fade, pointer repulsion, reduced-motion static render, IntersectionObserver pause, DPR handling — all unchanged.

## Out of scope

- No layout, color, or `FinalCTA.tsx` changes.
- No new dependencies.
- Dots stay locked to the grid; only brightness/size ripples.
