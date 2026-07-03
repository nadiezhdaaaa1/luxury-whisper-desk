## Replace gold accent with lighter navy blue — site-wide

Swap the champagne/gold accent for a lighter shade of the existing navy (`--primary: #001d3d`) across the entire site. Because nearly every component uses the `--champagne` token, one token change cascades everywhere.

### Token change (src/styles.css)
- `--champagne`: `oklch(0.78 0.06 82)` → `oklch(0.58 0.11 255)` — a soft steel/lighter navy.
- `--champagne-soft`: `oklch(0.92 0.035 85)` → `oklch(0.93 0.03 255)` — pale navy wash.
- `--ring`: align with new accent (both `:root` and `.dark`) so focus rings match.

Every `text-champagne`, `bg-champagne`, `border-champagne`, and `var(--champagne)` reference automatically picks up the new color — HowItWorks, Hero, BrandMarquee, Features, Categories, Audience, Comparison, Pricing, FAQ, FinalCTA, Footer, Navbar, `btn-ghost` hover, marquee/timeline SVGs.

### Hardcoded gold hex sweep
Search the whole `src/` tree for hardcoded gold values and replace them with the semantic token so nothing stays gold:
- `#C9A84C` (known in `ProblemSection.tsx`: `bg-[#C9A84C]/10` → `bg-champagne/10`, `text-[#C9A84C]` → `text-champagne`).
- Any other `#c9a84c`, `#C9A84C`, `#d4b054`, gold/amber/yellow arbitrary-value classes, or inline `style` gold values found during the sweep — replace with `champagne` / `champagne-soft` tokens.

### Not changing
- Navy `--primary` stays.
- No layout, typography, spacing, or component structure changes.
- No new tokens, fonts, or dependencies.

### Verification
After the edit, scroll the full landing page and confirm every previously-gold element (step dots, eyebrows, icon tiles, marquee accents, hover borders, dividers, chart strokes) now renders in the new lighter navy.
