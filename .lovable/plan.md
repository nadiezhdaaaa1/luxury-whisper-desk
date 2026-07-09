## Problem
The active portfolio card renders a range bar labelled with two prices. Those prices currently come from the deterministic demo market generator (`getMockMarketPrice().low / .high`), not from the alert thresholds the user actually enters when adding a piece.

## Goal
Make the range bar show the user's chosen alert prices, and position the marker using those alert prices.

## Plan
1. **Replace range endpoints in `PortfolioCard.tsx`**
   - Left value: `row.alert_below_price` when `row.alert_below_enabled` is true.
   - Right value: `row.alert_above_price` when `row.alert_above_enabled` is true.
   - Keep left text colored with the alert/burgundy token and right text with the positive/green token.

2. **Guard against missing alerts**
   - Only render the range bar when at least one alert is enabled and has a valid numeric price.
   - If only one side is set, use the purchase price or current market price as the implicit opposite bound so the marker still has a meaningful position, or hide the bar until both are set. (Assumption: hide when neither is set; use purchase price as fallback for the missing side when one is set.)

3. **Recalculate marker position**
   - Compute `markerPct` from the current market price relative to the alert range instead of the demo `mp.low` / `mp.high` range.
   - Clamp the marker between 0% and 100% and guard against a zero-width range.

4. **Preserve paused-card rule**
   - Read-only / paused items continue to hide the range bar, market price, and percentage change per the existing free-tier behavior.

5. **Verify**
   - Run typecheck/build to ensure no TypeScript errors.
   - Check the preview to confirm active cards now display the user's alert prices and the marker still positions correctly.

## Open question
If a user has only set one alert (below-only or above-only), would you prefer:
- A) hide the whole range bar until both alerts are set, or
- B) show the single alert with the purchase price or current market price as the other bound?

Default assumption in this plan is **B** for above/below context, but easy to switch to **A** if you prefer cleaner empty states.