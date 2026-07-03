Replace the translucent `card-soft` background on the category cards in `src/components/landing/Categories.tsx` with a solid white surface that matches the rest of the landing page.

## Change
- In `Categories.tsx` (line 75), swap `card-soft` for: `bg-white border border-hairline rounded-2xl shadow-soft`
- Keep everything else identical: padding, image positioning, status pill, brand list, dim-on-upcoming opacity.

## Result
Cards render on a solid `#ffffff` background with a 1px hairline border and the existing soft shadow, sitting on the cream `bg-surface/60` section — consistent with the Comparison table and other white surfaces.

No other files touched.