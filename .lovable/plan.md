## What I found

The underlying calculation is working for the current quiz draft:
- Saved draft has 11 selected brands across Watches + Jewelry.
- “By category” shows non-zero values: Watches `$31K–$55K`, Jewelry `$11K–$20K`.
- The headline still shows `$0–$0` because the count-up hook starts at `0` once and then refuses to restart when the real `range.low` / `range.high` arrives after the reveal renders.

## Plan

1. **Fix the count-up hook in `AhaReveal.tsx`**
   - Remove the one-time `startedRef` lock.
   - Restart the animation whenever the target number changes.
   - If the target is `0`, show `0`; if the target becomes non-zero later, animate to the new number.
   - Keep `prefers-reduced-motion` support.

2. **Make the headline range robust**
   - Ensure the hero headline directly uses the calculated `range.low` and `range.high` as animation targets.
   - Keep the display format unchanged (`$42K–$75K`, compact USD).

3. **Verify the real quiz state**
   - Re-check `/quiz` with the current saved draft.
   - Confirm the headline equals the sum of the visible category ranges instead of `$0–$0`.
   - Confirm changing selected brands/tier still changes the total.

## Expected result

For the current draft, the headline should animate to approximately `$42K–$75K` instead of staying at `$0–$0`, matching the summed Watches + Jewelry category ranges.