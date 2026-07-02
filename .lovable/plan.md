Enlarge the Rolex image so it overflows past the card's bottom edge, and align the progress bar under the title (not full width).

In `src/components/landing/Hero.tsx` (Target reached card, ~lines 124–146):
- Add `overflow-hidden` + `relative` to the card wrapper so the oversized image gets clipped by the card border. Keep existing padding so the card height stays the same as siblings.
- Restructure the tag/content row into a two-column flex:
  - Left column: the Rolex `<img>` sized much larger (e.g. `h-[140px] w-[140px]`), positioned with negative bottom margin (`-mb-16`) so the lower portion bleeds under the card border and is clipped by `overflow-hidden`.
  - Right column (`flex-1 min-w-0`): stacks the "Target reached" tag, the "Rolex Daytona" `<h2>`, and the progress bar block underneath the title — all constrained to this right column so the bar sits to the right of the image rather than spanning the full card width.
- Remove the current outer `mt-4 flex items-center gap-4` wrapper and the separate `mt-4` progress block; combine them into the right column stack.
- Card height stays visually identical because the extra image height is negative-margined and clipped.