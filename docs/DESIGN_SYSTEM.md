# Price.you Design System

Reference for building future pages (About, Pricing detail, Product, Blog, Legal, Dashboard shell) so they feel like the same product as the landing page.

Every class documented here already appears in the codebase — this is a mirror of reality, not a wish list. Tokens live in `src/styles.css`; utilities are Tailwind v4 (`@utility`) and semantic (`text-foreground`, `bg-surface`) — never hardcode colors in components.

---

## 1. Brand & tone

- **Editorial-luxury, quiet confidence.** Warm ivory paper, deep navy ink, teal for gain, muted burgundy for alert. No SaaS gradients, no neon.
- **Fonts:**
  - `--font-display` → **Manrope** (all headings, eyebrows, buttons, numeric emphasis)
  - `--font-sans` → **Inter** (body text)
  - **Montserrat** — reserved for the `PRICE.YOU` wordmark only (inline `style` in Navbar/Footer)
- **Headings H1–H5 are Manrope Medium (`font-weight: 500 !important`)** — utility weight classes on those elements are overridden by base CSS.

**Don't:**
- Introduce a fourth typeface.
- Use purple/indigo gradients, glassmorphism-for-its-own-sake, or generic hero blobs. (Exception: radial gradients for button interaction lighting — see §6/§10.)
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

- **App cards → `rounded-lg` (14px)** — signal cards, dashboard cards, watchlist items, portfolio items. Tighter on purpose: app surfaces are denser and stack many cards per screen.
- **Marketing cards → `rounded-2xl` (22px)** — landing page, pricing, `card-soft` panels. Unchanged.
- Hairline-grid outer shell → `rounded-sm`
- Buttons / pills / chips → `rounded-full`
- Icon chip → `rounded-xl`
- Small form fields → `rounded-md`

### Shadows

Card elevations, defined as utilities:
- `shadow-soft` — marketing cards at rest; **hover** state for interactive app cards
- `shadow-lift` — hover / emphasis / floating panels

Plus the app-card resting token:
- `--shadow-card` — the constant resting elevation for app cards, a single `0 1px 2px` at 3.5%. Deliberately far lighter than `shadow-soft`, because `shadow-soft` is now the *hover* state for interactive app cards rather than a resting elevation.

### Interaction

- `--card-border-hover` — the stroke colour an interactive card moves to on hover.

Plus three **button-only** tokens (not available as utilities). They are **constant** — buttons never change elevation on hover or press. Two weights exist so dark and light fills read at the same height: a low-opacity shadow that reads clearly under a white pill disappears entirely under navy.
- `--shadow-btn` — light fills (`.btn-secondary`)
- `--shadow-btn-strong` — dark fills (`.btn-primary`, `.btn-destructive`)
- `--shadow-btn-on-navy` — white pill sitting on the navy panel (`.btn-on-navy`)


Do not add ad-hoc `shadow-*` values. Add a new token if a third card elevation is truly needed.

### App card interaction

- The card fill **never changes** on hover. Interaction is carried by the stroke and the shadow: `border-hairline → var(--card-border-hover)` plus `shadow-[var(--shadow-card)] → shadow-soft`, over 150ms on `border-color` and `box-shadow` only.
- **Only interactive cards hover.** A card that is a link or a button hovers; a card whose only affordance is a `⋮` menu does not. On the dashboard that means the three stat cards hover and the two upper blocks do not. On watchlist and portfolio it means cards hover only in select mode, when the whole card becomes a button.
- Selected state is `ring-2 ring-primary shadow-soft`.
- Cards that are themselves a link keep their inner controls above the overlay: wrap content in `pointer-events-none` and re-enable `pointer-events-auto` on the interactive parts.

---

## 6. Component recipes

Copy-pasteable class strings for the vocabulary already in use.

### Buttons

```tsx
<a href="/start" className="btn-primary btn-lg">Get started</a>
<a href="#" className="btn-secondary">Learn more</a>
<button className="btn-tertiary btn-sm">Log in</button>
<button className="btn-destructive">Delete my account</button>
<a href="/quiz" className="btn-on-navy">Start free</a>
<a href="#" className="btn-ghost-navy">Learn more</a>
```

**Flat, fill-driven model.** Buttons never move off their baseline and never change elevation. Shadows are constant.

**Five variants** — `btn-primary` (navy fill), `btn-secondary` (white fill + warm stroke), `btn-tertiary` (transparent, warm sand on interaction), `btn-destructive`, and the navy-panel pair `btn-on-navy` / `btn-ghost-navy`. The secondary's border is load-bearing on white card surfaces, where the fill alone does not separate it from the ground.

**Four size modifiers** — `btn-sm` (36px), default (44px), `btn-lg` (52px), `btn-icon` (44×44) and `btn-icon-sm` (36×36). They are plain CSS classes, not `@utility`, so unlayered specificity guarantees they override each variant's own height and padding. `btn-sm` and `btn-icon-sm` are **desktop-only** — 36px is below the touch minimum; anything reachable by thumb stays at 44px or uses `btn-lg`.

**Six states**

- **Rest** — variant fill, constant shadow.
- **Hover** — fill shifts (and border colour where there is one). Guarded behind `@media (hover: hover) and (pointer: fine)` so it cannot stick after a tap.
- **Press** — `scale(0.965)` in place plus a darker fill step. No translation, no elevation change ever.
- **Focus** — `:focus-visible` ring: 2px background gap + 4px `--color-ring` (champagne) on every variant; the navy-panel variants swap in `--navy-panel` / `--ring-on-navy`. Never remove it.
- **Disabled** — `opacity: 0.42`, no shadow, no press transform, `cursor: not-allowed`.
- **Edge-origin glow** — `.btn-primary` only, champagne radial gradient painted as a background layer (no extra markup), driven by the `usePointerGlow` hook. Attach the returned ref to the element. Touch pointers get a ripple (`.btn-tapping`) instead of a glow.

**Buttons shown side by side as a pair share one size modifier.** A primary at `btn-lg` next to a secondary at the default height is a bug, not emphasis — hierarchy between a CTA pair comes from fill weight, never from height.




### Cards

```tsx
{/* Default soft card */}
<div className="bg-white/85 border border-white rounded-2xl shadow-soft p-6">…</div>

{/* Glass card */}
<div className="card-soft p-4">…</div>  {/* .card-soft = translucent white, backdrop-blur, shadow-soft */}

{/* App card (static) */}
<div className="rounded-lg border border-hairline bg-card shadow-[var(--shadow-card)] p-5">…</div>

{/* App card (interactive) */}
<div className="rounded-lg border border-hairline bg-card shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--card-border-hover)] hover:shadow-soft p-5">…</div>

{/* Hairline-grid cell */}
<div className="bg-background p-6 lg:p-8">…</div>
```

**`card-flat` is legacy — do not use it on new surfaces.** It declares `box-shadow: none !important`, which silently overrides any shadow class placed alongside it. That `!important` was hiding a `transition-shadow` and a `shadow-md` selected state on the watchlist and portfolio cards until it was removed. No app card uses it any more.


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
| `usePointerGlow` (`src/hooks/use-pointer-glow.ts`) | Edge-origin pointer glow + touch ripple for `.btn-primary`; limited to the hero CTA and FinalCTA. Shares HeroDotField's 0.18 rAF lerp; bails out entirely on `prefers-reduced-motion` and skips the glow for touch pointers |

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
- Reuse `.container-page`, `.eyebrow`, `.btn-primary`, `.btn-secondary`, `.card-soft`, `shadow-soft`, `shadow-lift` — extend these utilities in `src/styles.css` when a new primitive is needed on 2+ pages.
- Use semantic tokens (`text-foreground`, `bg-surface`, `border-hairline`).
- Match section padding to `py-16 lg:py-24`.
- Alternate banded (`bg-surface/60 border-y border-hairline`) with plain sections down the page.
- Keep hero-level headline text under 8 words when possible.

**Don't**
- Hardcode colors (`text-white`, `#001d3d`, `bg-black`) in components. If a new color is needed, add a token first.
- Introduce new fonts — Manrope / Inter / Montserrat only.
- Use `bg-gradient-*` (v3 name, no-ops in v4) or `bg-linear-*` gradients as decoration. This system is flat-and-warm, not gradient-first. **Exception:** radial gradients used as *interaction lighting* on buttons (the `.btn-primary` pointer glow and tap ripple) are allowed — decorative background gradients are still out.
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
