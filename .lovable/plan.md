## HowItWorks section — bigger navy step labels + visual demos under each step

Update `src/components/landing/HowItWorks.tsx` only. Also add one new asset pointer for the Tissot watch image.

### Typography change
- "STEP 01/02/03" labels: bump from `text-xs` → `text-sm`, keep semibold + wide tracking, change color from `text-champagne` → `text-primary` (dark navy).
- Step titles: bump from `text-xl` → `text-2xl`.

### New visual demos (one under each step, above/replacing current spacing)
Rendered as static mock UI inside each step column, styled with existing tokens (`card-soft`, `bg-surface-2`, `text-primary`, `border-hairline`, `font-display`).

**Step 1 — Category chips**
- Wrap of 6 rounded-full chips: `Watches` ✓, `Tissot` ✓, `Rolex`, `Handbags`, `Jewelry`, `Sneakers`.
- Checked chips: navy bg (`bg-primary text-primary-foreground`) with a small Check icon.
- Unchecked chips: `bg-surface-2 border border-hairline text-foreground` with an empty circle indicator.

**Step 2 — Mini form**
- Small card (`card-soft p-4`) containing:
  - Row 1: label "Turn on signals" + a mock toggle switch (on state, navy track + white knob).
  - Row 2: text input styled with `border-hairline` showing the value `Tissot PRX Powermatic 80` with a subtle caret/underline.

**Step 3 — Product card with alert tag**
- Small card (`card-soft p-4`) with:
  - Watch photo (Tissot PRX, new asset) on a soft cream tile (`bg-[#F7F3EC] rounded-xl aspect-square`).
  - Product name `Tissot PRX Powermatic 80` (font-display, semibold).
  - Tag styled exactly like Hero's "Retail increase" pill: burgundy `#720026` bg at 10% opacity, animated ping dot, uppercase text — label: `Price rise detected`.

### Asset
- Add `src/assets/tissot-prx.png.asset.json` created via `lovable-assets create --file /mnt/user-uploads/Steps_pic.png --filename tissot-prx.png`.
- Import it in HowItWorks and use `.url` for the img src.

### Layout notes
- Keep the existing horizontal timeline line + dots at top of each column.
- Demo panels go below the step text with `mt-6` and `max-w-sm` so they align with the column width.
- Ensure equal column heights via `md:items-stretch` / flex on each column so the visuals bottom-align nicely.

No other files or business logic touched.