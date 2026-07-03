## Rebuild Problem section — split layout + 2×2 grid

Replace `src/components/landing/ProblemSection.tsx` with the selected v3 direction, adapted to the project's existing tokens (Manrope/Inter, ivory bg, navy text, gold `#C9A84C`, burgundy `#720026`).

### Layout
- 12-col grid, `gap-x-24`, `items-start`
- Left column (`col-span-5`, sticky on desktop):
  - Small eyebrow row: 32px burgundy hairline + `THE PROBLEM` in burgundy, 11px, tracking-[0.3em], bold uppercase
  - H2 headline (Manrope bold, 4xl → 5xl): "The luxury market moves faster than *your spreadsheet*" — last two words in gold italic medium
  - Sub-paragraph in muted-foreground, `max-w-md`
- Right column (`col-span-7`): 2×2 grid, `gap-px` on hairline background, wrapped in a hairline border with `rounded-sm` — creates thin gold-neutral divider lines between quadrants
  - Each quadrant: `p-10`, ivory bg, hover fades to pure white
  - Icon in 48×48 rounded-xl gold-tinted tile (`bg-[#C9A84C]/10`, `text-[#C9A84C]`), scales 110% on hover
  - Title: Manrope bold, `text-xl`
  - Body: Inter, `text-sm`, muted-foreground

### Content (unchanged)
Four items keep existing titles + descriptions:
1. Price rises arrive late
2. Your collection is scattered
3. You don't see total capital
4. Windows close fast

### Icons (lucide-react)
`Clock`, `Images`, `EyeOff`, `Zap` — swap in something more fitting per item if warranted, but keep gold tile treatment.

### Section chrome
Keep existing `border-t border-hairline` and `py-20 lg:py-28`, keep `.container-page`. No changes to `routes/index.tsx` or other sections.

### Not changing
- No new fonts, no @fontsource installs — Manrope/Inter already loaded
- No route changes, no other components touched
- No animation library added; rely on existing Tailwind transitions for hover
