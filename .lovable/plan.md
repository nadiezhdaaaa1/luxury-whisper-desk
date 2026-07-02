Tighten the polka dot texture and speed up its fade-in on the hero background.

In `src/components/landing/HeroDotField.tsx`:
- Reduce dot grid spacing from `16px` to `10px` and shrink the dot from 1px/1.5px to ~0.75px/1px for a finer texture.
- Speed up the appearance: shorten the opacity transition from `200ms` to `80ms` and widen the near-edge full-opacity band (NEAR 40→80, FAR 160→200) so dots reach full strength sooner as the cursor approaches the panel.