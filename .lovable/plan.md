Return the "Target reached" tag to the top of the card, then enlarge the Rolex image and let it bleed past both the left and bottom edges.

In `src/components/landing/Hero.tsx` (Target reached card):
- Keep `relative overflow-hidden` on the card wrapper so overflow is clipped.
- Move the tag back to its original position as the first child inside the card (above the image + text row).
- Replace the two-column row so the image bleeds off two edges:
  - `<img>` grows to `h-[200px] w-[200px]`, `object-contain`, positioned with negative margins `-ml-10 -mb-16` and `self-end` so the left/bottom portions are clipped by the card's rounded border.
  - Right column keeps `flex-1 min-w-0` with the "Rolex Daytona" `<h2>` and the progress bar block stacked underneath.
- Card height stays visually the same (extra image size absorbed by negative margins + clipping).