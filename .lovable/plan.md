Replace the three category icons (Luxury/Investment, Mid-market, Mass-market) in the quiz market-segment step with the uploaded 3D images (Lux.png diamond, Mid.png silver star, Mas.png silver shopping bag).

## Steps

1. Upload the three images to CDN via `lovable-assets create` from `/mnt/user-uploads/`, writing pointers to:
   - `src/assets/segment-luxury.png.asset.json`
   - `src/assets/segment-mid.png.asset.json`
   - `src/assets/segment-mass.png.asset.json`

2. In `src/components/quiz/QuizFlow.tsx`:
   - Import the three asset JSON pointers.
   - Replace the `SEGMENT_ICONS` map (currently mapping to lucide `Crown`/`Sparkles`/`Users`) with a map of image URLs.
   - Update the rendering spot (around line 306, inside the segment option card) to render an `<img>` with the asset URL instead of the lucide `<Icon />`. Keep the existing circular badge container, sizing, and layout; drop the circle's background tint since the 3D icons have their own visual weight (or keep a subtle bg — pick whichever preserves the existing card proportions best).
   - Remove now-unused `Crown`/`Sparkles`/`Users` imports if no longer referenced elsewhere in the file.

3. Leave all other logic (selection state, single-select behavior, labels, checkmark indicator, styling of the card) unchanged.
