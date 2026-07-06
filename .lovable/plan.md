Add a subtle right-side brightness ramp to the ParticleField dots so the field feels a touch more luminous toward the right edge while keeping the left fade and middle exactly as they are today.

## Change

In `src/components/landing/ParticleField.tsx`, after computing the left-edge `mask`, multiply the alpha by a horizontal brightness factor that:
- Stays at 1.0 from the left through the middle (up to ~60% of the width).
- Ramps linearly up to 1.20 at the right edge (a ~20% boost).

Apply the same ramp in both the animated `draw` path and the `prefers-reduced-motion` static path so both render consistently.

### Technical detail

```ts
const brightStart = w * 0.60;
const brightBoost = 0.20; // +20% at right edge
const bright = x <= brightStart
  ? 1
  : 1 + brightBoost * ((x - brightStart) / (w - brightStart));

const alpha = BASE_ALPHA * (0.35 + 0.65 * intensity) * mask * bright;
```

No other files change. Left fade, wave motion, spacing, pointer interaction, and color all stay identical.