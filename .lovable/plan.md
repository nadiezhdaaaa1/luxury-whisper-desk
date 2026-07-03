Three small tweaks to the Feature 01 card in `src/components/landing/Features.tsx`:

1. **Remove the top-right glow** — delete the absolutely positioned radial-gradient blur div (lines 78–79) inside the primary block.
2. **Remove strokes from the option rows** — in `SignalFeed` (line 13), drop `border border-hairline` from each row so the pills sit flush on the card background.
3. **Match the Feature 02 label color** — change the "Feature 01 · The core" label (line 80) from `text-champagne` to `text-muted-foreground`, matching Feature 02's muted grey.

No layout, spacing, or content changes.