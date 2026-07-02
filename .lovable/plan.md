Extend the polka dot spotlight to follow the cursor over the bento panel too, keeping the dots behind the cards.

In `src/components/landing/HeroDotField.tsx`:
- Remove the "hide when inside the panel" branch so `edge = 1` whenever the cursor is inside the panel bounds, and continues to fade with distance when outside (NEAR 80 / FAR 200 unchanged).
- Keep the layer at `z-0` behind the bento panel/cards; the panel's 4% black frame and the translucent white cards already sit above it, so dots will read through gaps and around cards without overlapping card content visually.
- No changes to card styling or z-index — the existing stacking (dot field z-0, panel/cards above) already places the texture behind the cards.