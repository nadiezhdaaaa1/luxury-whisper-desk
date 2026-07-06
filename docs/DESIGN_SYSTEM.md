# LuxTracker Design System

Reference for building future pages (About, Pricing detail, Product, Blog, Legal, Dashboard shell) so they feel like the same product as the landing page.

Every class documented here already appears in the codebase — this is a mirror of reality, not a wish list. Tokens live in `src/styles.css`; utilities are Tailwind v4 (`@utility`) and semantic (`text-foreground`, `bg-surface`) — never hardcode colors in components.

---

## 1. Brand & tone

- **Editorial-luxury, quiet confidence.** Warm ivory paper, deep navy ink, teal for gain, muted burgundy for alert. No SaaS gradients, no neon.
- **Fonts:**
  - `--font-display` → **Manrope** (all headings, eyebrows, buttons, numeric emphasis)
  - `--font-sans` → **Inter** (body text)
  - **Montserrat** — reserved for the `LUXTRACKER` wordmark only (inline `style` in Navbar/Footer)
- **Headings H1–H5 are Manrope Medium (`font-weight: 500 !important`)** — utility weight classes on those elements are overridden by base CSS.

**Don't:**
- Introduce a fourth typeface.
- Use purple/indigo gradients, glassmorphism-for-its-own-sake, or generic hero blobs.
- Hardcode `text-white`, `bg-black`, `#hex` in components — extend tokens instead.

---

## 2. Color tokens

All from `src/styles.css`. Reference as Tailwind classes (`bg-surface`, `text-muted-foreground`, `border-hairline`, `text-positive`, etc.).

### Surfaces
| Token | Use |
|---|---|
| `background` — warm ivory `oklch(0.985 0.006 80)` | default page background |
| `surface` | alternating section band (`bg-surface/60`) |
| `surface-2` | pale sand — inset chips, subtle depth |
| `card` | true white card surface |

### Text
| Token | Use |
|---|---|
| `foreground` | primary text on ivory |
| `muted-foreground` | secondary / supporting text, eyebrows |
| `foreground/70`, `foreground/80`, `foreground/90` | in-body opacity ladder for de-emphasized links & labels |

### Brand
| Token | Value | Use |
|---|---|---|
| `primary` | navy `#001d3d` | wordmark, primary buttons, key numeric labels |
| `primary-foreground` | ivory | text on navy |
| `champagne` | navy-blue accent `oklch(0.58 0.11 255)` | secondary accent bar, chart segment 1 |
| `champagne-soft` | pale navy wash | badge fills, hover surfaces |

### Semantic
| Token | Use |
|---|---|
| `positive` — teal `#034748` | gains, check indicators, success chips |
| `alert` — muted burgundy | warnings, price-rise alerts |
| `destructive` | delete / irreversible actions |

### Structure
| Token | Use |
|---|---|
| `hairline` | 1px dividers, grid separators (`gap-px bg-hairline`) |
| `border` | form field borders |
| `ring` | focus ring |

---

## 3. Typography

### Scale actually used

| Element | Classes |
|---|---|
| Hero H1 | `font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]` |
| Section H2 | `font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]` |
| Feature block H3 | `font-display text-2xl sm:text-3xl font-bold leading-tight` |
| Card H3 | `font-display font-semibold text-xl` |
| Card H4 | `font-display font-semibold text-base` |
| Body large | `text-base text-muted-foreground` |
| Body default | `text-sm text-muted-foreground leading-relaxed` |
| Body dense | `text-[13px] sm:text-[15px] text-muted-foreground` |
| Micro / meta | `text-xs text-muted-foreground` |
| Numeric emphasis | `font-display font-bold text-2xl` |

Remember: on `<h1>`–`<h5>`, `font-bold` renders as Manrope Medium due to the base override. Use `<div>` or `<p>` with `font-display font-bold` when you need real bold weight (e.g. numeric callouts).

### Eyebrow

Every section starts with an eyebrow label above the H2:

```tsx
<span className="eyebrow">Features</span>
```

The `.eyebrow` utility: Manrope 12px semibold, uppercase, `tracking: 0.14em`, `muted-foreground`. Do not restyle — reuse.

---

## 4. Spacing & layout

### Page container

```tsx
<div className="container-page"> … </div>
```
`.container-page` → `max-width: 80rem`, `padding-inline: 1.25rem`, centered.

### Section rhythm

Every section: **`py-16 lg:py-24`**. Do not invent other values.

Alternating band sections add a soft surface + hairline top/bottom:

```tsx
<section id="…" className="py-16 lg:py-24 bg-surface/60 border-y border-hairline">
```

Used on: Categories, Audience, HowItWorks, Comparison, FAQ. Straight ivory (no band) on: Hero, Features, Pricing, FinalCTA.

### Grids

- Card grid gutter: `gap-5`
- Hairline-grid (signature look): `grid gap-px bg-hairline` wrapped in `overflow-hidden rounded-sm border border-hairline` — cells get `bg-background` so the 1px gap shows through as a hairline divider.
- Feature layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (or `-4`, `-5` for Feature-01/02 asymmetric split)

### Vertical rhythm inside a section

- Eyebrow → H2: `mt-3`
- H2 → intro `<p>`: `mt-4`
- Header block → grid: `mt-12` (or `mt-20` for HowItWorks timeline)
- Card icon chip → H4: `mt-4`
- H4 → body: `mt-2`
- Body → CTA / arrow: `mt-3`

### Card padding

- Default card: `p-6`
- Hairline-grid cell: `p-6 lg:p-8` (desktop +8px)
- Prominent card (Audience columns): `p-7 pb-9 lg:p-9 lg:pb-11` (the "+8px on desktop" pattern)

---

## 5. Radii & elevation

### Radii

`--radius: 0.875rem` base. Available: `rounded-sm | -md | -lg | -xl | -2xl | -3xl`.

- Cards → `rounded-2xl`
- Hairline-grid outer shell → `rounded-sm`
- Buttons / pills / chips → `rounded-full`
- Icon chip → `rounded-xl`
- Small form fields → `rounded-md`

### Shadows

Only two, both defined as utilities:
- `shadow-soft` — every card at rest
- `shadow-lift` — hover / emphasis / floating panels

Do not add ad-hoc `shadow-*` values. Add a new token if a third elevation is truly needed.

---

## 6. Component recipes

Copy-pasteable class strings for the vocabulary already in use.

### Buttons

```tsx
<a href="/start" className="btn-primary">Get started</a>
<a href="#" className="btn-ghost">Learn more</a>
```
Both are rounded-full, Manrope semibold, 0.9rem. Navbar mobile shrinks to `btn-primary text-xs px-4 py-2`.

### Cards

```tsx
{/* Default soft card */}
<div className="bg-white/85 border border-white rounded-2xl shadow-soft p-6">…</div>

{/* Glass card */}
<div className="card-soft p-4">…</div>  {/* .card-soft = translucent white, backdrop-blur, shadow-soft */}

{/* Hairline-grid cell */}
<div className="bg-background p-6 lg:p-8">…</div>
```

### Status pill (Categories "At launch" / "Coming next")

```tsx
<span
  className="text-[11px] font-display font-semibold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-[0.05em]"
  style={{
    color,
    backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
  }}
>
  {status}
</span>
```
Color choice: `var(--positive)` for at-launch, `var(--primary)` for next, `#78716c` for later.

### Icon chip (Features grid)

```tsx
<div className="h-9 w-9 rounded-xl grid place-items-center" style={{ backgroundColor: "#0f1b3d" }}>
  <Icon className="h-4 w-4 text-white" />
</div>
```

### Section header block

```tsx
<div className="max-w-2xl">
  <span className="eyebrow">Section name</span>
  <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
    Headline that promises the outcome
  </h2>
  <p className="mt-4 text-base text-muted-foreground">Optional single-sentence intro.</p>
</div>
```

### Divider

```tsx
<div className="border-t border-hairline" />
```

### Segmented progress bar (portfolio total)

```tsx
<div className="flex gap-1 h-2 rounded-full overflow-hidden">
  <div className="bg-champagne" style={{ width: "45%" }} />
  <div className="bg-positive/70" style={{ width: "30%" }} />
  <div className="bg-primary/80" style={{ width: "25%" }} />
</div>
```

### Check indicator (Comparison table, Audience bullets)

- Positive tick on brand row: `h-6 w-6 rounded-full bg-positive text-primary-foreground` + `Check h-3.5 w-3.5`
- Positive tick on default row: `bg-positive/15 text-positive`
- Neutral dot: `bg-surface-2 text-muted-foreground` + inner `h-1.5 w-1.5 rounded-full bg-muted-foreground/60`
- Missing: `text-muted-foreground/60` + `Minus h-3.5 w-3.5`

---

## 7. Section pattern (the shell)

Every new marketing/content section on a future page should start from this shell:

```tsx
<section id="section-id" className="py-16 lg:py-24 bg-surface/60 border-y border-hairline">
  <div className="container-page">
    <div className="max-w-2xl">
      <span className="eyebrow">Eyebrow</span>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
        Headline
      </h2>
      <p className="mt-4 text-base text-muted-foreground">Optional intro sentence.</p>
    </div>

    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* content */}
    </div>
  </div>
</section>
```

Drop `bg-surface/60 border-y border-hairline` for a plain ivory section. Alternate banded and plain sections down a page — never two banded sections back-to-back.

---

## 8. Motion

Utilities defined in `src/styles.css`, all reduced-motion-safe:

| Utility | Use |
|---|---|
| `rise-in`, `rise-in-delay-1..4` | Staggered entrance for hero elements or first-viewport cards |
| `draw-line` | SVG stroke reveal (charts, underlines) — pair with `stroke-dasharray: 400` |
| `fill-bar` | Progress bar fill on scroll-in; set `--bar-target` inline |
| `marquee`, `marquee-reverse` | Continuous brand strip (36s / 44s) — used in BrandMarquee |

Do not reach for third-party animation libs for these primitives. Framer Motion is available for component-level orchestration if a future page genuinely needs it.

---

## 9. Iconography

- Library: **lucide-react** exclusively.
- Sizes:
  - Inline with eyebrow: `h-3.5 w-3.5`
  - In buttons: `h-4 w-4`
  - Standalone glyph: `h-5 w-5`
- Custom SVGs (`Mark` in Categories, sparkline in Hero): `strokeWidth="1.4"`, `fill="none"`, `stroke="currentColor"`.
- Small check inside chip: `strokeWidth={3}` to keep the tick legible at `h-3 w-3`.

---

## 10. Do / Don't

**Do**
- Reuse `.container-page`, `.eyebrow`, `.btn-primary`, `.btn-ghost`, `.card-soft`, `shadow-soft`, `shadow-lift` — extend these utilities in `src/styles.css` when a new primitive is needed on 2+ pages.
- Use semantic tokens (`text-foreground`, `bg-surface`, `border-hairline`).
- Match section padding to `py-16 lg:py-24`.
- Alternate banded (`bg-surface/60 border-y border-hairline`) with plain sections down the page.
- Keep hero-level headline text under 8 words when possible.

**Don't**
- Hardcode colors (`text-white`, `#001d3d`, `bg-black`) in components. If a new color is needed, add a token first.
- Introduce new fonts — Manrope / Inter / Montserrat only.
- Use `bg-gradient-*` (v3 name, no-ops in v4) or `bg-linear-*` gradients as decoration. This system is flat-and-warm, not gradient-first.
- Add ad-hoc shadow values — extend `--shadow-*` in `src/styles.css`.
- Nest banded sections adjacent to each other — the boundary is invisible.
- Use `rounded-lg` on cards by default — the signature radius is `rounded-2xl`.

---

## 11. Future additions (deliberate gaps)

Not built yet. Add here — and add a matching token/utility to `src/styles.css` — when the first page needs them:

- Form field styles (input, textarea, select, checkbox, radio) — Comparison uses static hairline boxes, no real inputs yet.
- Tabs & segmented control.
- Toasts & inline banners (only `alert` color token exists; no component).
- Empty-state illustration guidelines.
- Dark-mode audit — dark tokens exist in `:root.dark` but no surface in the app opts in yet; verify contrast before shipping a dark page.
- Data-viz palette beyond `champagne` + `positive/70` + `primary/80` — extend when >3 series are needed.
- Table styles for logged-in dashboard views — Comparison is the only table today and is content-specific.
