## Goal

Replace the current organic particle flow in `src/components/landing/ParticleField.tsx` with a **strict grid of dots** where **brightness and size ripple across the grid in slow diagonal waves** — bands of dots quietly brighten and dim like data pulsing through a matrix.

## Changes (single file: `src/components/landing/ParticleField.tsx`)

1. **Positions become fixed grid slots**
   - Keep the existing `spacing = 14` px lattice.
   - Remove `hx/hy`, `ox/oy`, `vx/vy`, per-dot `phase`, and the sine flow-field offsets. Each dot is drawn at its exact grid coordinate.

2. **Diagonal density wave (the core new effect)**
   - Compute a scalar wave per dot per frame:
     `wave = 0.5 + 0.5 * sin((gx + gy) * 0.35 - t * 0.6)`
     where `gx, gy` are integer grid indices and `t` is seconds. The `gx + gy` term makes the crest travel diagonally across the grid.
   - Layer a second, slower, opposite-direction wave at lower amplitude for subtle interference:
     `wave2 = 0.5 + 0.5 * sin((gx - gy) * 0.22 + t * 0.35)`
   - Combine: `intensity = 0.65 * wave + 0.35 * wave2` (0–1).

3. **Map intensity to opacity and size** (keeps it subtle, not blinking)
   - Opacity: `baseAlpha * (0.35 + 0.65 * intensity)` — dots never fully disappear.
   - Radius: `baseR * (0.85 + 0.35 * intensity)` — very small pulse.

4. **Preserve the existing polish**
   - Keep the left-edge fade ramp (`w * 0.32` → `w * 0.62`) so the grid dissolves into the CTA text side.
   - Keep pointer repulsion (`POINTER_RADIUS`, `POINTER_FORCE`) but apply it as a per-frame *display* offset from the grid slot with eased return — the dot's "home" stays exactly on the grid.
   - Keep `ResizeObserver`, `IntersectionObserver` pause-when-offscreen, `prefers-reduced-motion` (renders a static grid at mid-intensity), `dpr` scaling, and the 50 ms frame cap.

5. **Tuning defaults**
   - `baseAlpha = 0.55`, `baseR = 1.0` px (pre-dpr).
   - Wave speed slow enough that a full crest takes ~10 s to cross the visible grid — should read as "breathing," not "scrolling."

## Out of scope

- No changes to `FinalCTA.tsx`, layout, colors, or the left-side copy/button.
- No new dependencies.
