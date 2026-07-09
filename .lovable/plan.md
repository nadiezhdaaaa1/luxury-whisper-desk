## Fix

In `src/components/signals/ImportantSignalCard.tsx` the portfolio thumb wrapper has `rounded-lg border` but no `overflow-hidden`, and the image sits inside a separate `rounded-l-lg` box. The visible result is that the image's own rounded corners read as the shape, while the card border stays square-ish — so the photo looks like a floating rounded tile instead of being flush inside the chip.

Change the thumb so the chip is the shape and the image fills it cleanly:

- Add `overflow-hidden` to the outer chip container so the image is clipped by the chip's radius.
- Drop the inner `rounded-l-lg` on the image box (redundant once the parent clips).
- Keep the image box at h-9 w-9 flush to the left edge, no gap.

No other components touched.