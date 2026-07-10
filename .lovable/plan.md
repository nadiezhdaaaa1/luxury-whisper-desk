Update padding inside the three dashboard cards so the internal spacing is 16px on mobile and 20px on desktop (the user explicitly wants desktop larger than mobile).

### Files to change
- `src/components/dashboard/ValueCard.tsx` — line 72: change `p-6 sm:p-8` → `p-4 sm:p-5`
- `src/components/dashboard/CategoryDonutCard.tsx` — lines 82 and 135: change both `p-6 sm:p-8` → `p-4 sm:p-5`
- `src/components/dashboard/SignalStatCard.tsx` — line 24: change `p-5 sm:p-6` → `p-4 sm:p-5`

### Verification
- Run `bunx tsgo --noEmit` to confirm no type errors.
- Check the `/app` preview to ensure the dashboard cards still render correctly with the new padding.