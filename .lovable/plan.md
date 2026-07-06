## Goal

Extract the design language that already exists across the landing page (Hero, Features, Categories, Audience, Comparison, HowItWorks, Pricing, FAQ, Navbar, Footer, etc.) and document it as a single reference so future pages (about, pricing detail, product, blog, legal, dashboard shell) stay visually consistent.

No code behavior changes. This creates one new documentation file. No component refactors, no token renames, no CSS edits.

## Deliverable

A single markdown file: `docs/DESIGN_SYSTEM.md`

## Sections in the doc

1. **Brand & tone** — warm ivory + navy, editorial-luxury, quiet confidence. Distinctive fonts (Manrope display, Inter body, Montserrat wordmark). "Not another purple-gradient SaaS" guardrails.

2. **Color tokens** (from `src/styles.css`) — with intent and when to use each:
   - Surfaces: `background` (ivory), `surface`, `surface-2`, `card`
   - Text: `foreground`, `muted-foreground`, `foreground/70..80` opacity ladder
   - Brand: `primary` (navy #001d3d), `champagne` (navy-blue accent), `champagne-soft` (wash)
   - Semantic: `positive` (#034748 teal), `alert` (muted burgundy), `destructive`
   - Structure: `hairline` (dividers), `border`, `ring`

3. **Typography** — font families, the H1–H5 Manrope-Medium override, the display/body split, the heading scale actually used (`text-3xl sm:text-4xl lg:text-5xl` for H2, `text-2xl sm:text-3xl` for H3, `text-base` H4), body sizes (`text-sm`, `text-[13px] sm:text-[15px]`), and the eyebrow pattern (`.eyebrow` utility, `tracking-[0.14em]` uppercase).

4. **Spacing & layout**
   - Page container: `.container-page` (max-w-80rem, px-5)
   - Section rhythm: `py-16 lg:py-24`
   - Card padding: `p-6 lg:p-8` (and the +8px desktop bump pattern like `p-7 pb-9 lg:p-9 lg:pb-11`)
   - Grid gaps: `gap-5` cards, `gap-px bg-hairline` for hairline-separated grids
   - Heading-to-body gap: `mt-3`, section-to-grid gap: `mt-12`

5. **Radii & elevation**
   - Radius scale (`--radius: 0.875rem` base, sm/md/lg/xl/2xl/3xl)
   - `shadow-soft` (default cards), `shadow-lift` (hover/emphasis)
   - Hairline-grid pattern (`gap-px bg-hairline` + `border border-hairline rounded-sm`) as the signature card container

6. **Component recipes** — copy-pasteable class strings for:
   - Buttons: `.btn-primary`, `.btn-ghost`
   - Cards: default (`bg-white/85 border border-white rounded-2xl shadow-soft p-6`), soft glass (`.card-soft`), hairline-grid cell (`bg-background p-6 lg:p-8`)
   - Status pill (Categories): color-mixed background at 10%, uppercase 11px display font
   - Eyebrow label (`.eyebrow`)
   - Icon chip (Features): `h-9 w-9 rounded-xl grid place-items-center` navy bg + white icon
   - Section header block (eyebrow + H2 + intro `<p>` inside `max-w-2xl`)
   - Divider / hairline
   - Segmented progress bar

7. **Section patterns** — the repeatable page-level shell:
   ```
   <section id="…" className="py-16 lg:py-24 [bg-surface/60 border-y border-hairline]?">
     <div className="container-page">
       <div className="max-w-2xl">
         <span className="eyebrow">…</span>
         <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">…</h2>
       </div>
       <div className="mt-12 grid …">…</div>
     </div>
   </section>
   ```
   Note when to add `bg-surface/60 border-y border-hairline` (alternating band sections like Categories, Audience).

8. **Motion** — the existing utilities (`rise-in`, `rise-in-delay-1..4`, `draw-line`, `fill-bar`, `marquee`) and when to reach for them; reduced-motion behavior is already handled.

9. **Iconography** — lucide-react, `h-3.5 w-3.5` inline with eyebrow, `h-4 w-4` in buttons, `h-5 w-5` in Mark glyphs, `strokeWidth="1.4"` for custom SVGs.

10. **Do / Don't** — explicit guardrails:
    - Do use semantic tokens (`text-foreground`, `bg-surface`).
    - Don't hardcode colors (`text-white`, `#hex`) in components — extend tokens in `src/styles.css` instead.
    - Don't introduce new fonts; use Manrope / Inter / Montserrat.
    - Don't use purple gradients or generic SaaS glassmorphism.
    - Don't invent new section paddings; use `py-16 lg:py-24`.

## Technical notes

- Read-only survey of `src/styles.css` and `src/components/landing/*` to make sure every documented class is one that already appears in the code — the doc reflects reality, not aspiration.
- No changes to `src/styles.css`, no new tokens, no new utilities in this pass. If gaps show up while writing (e.g. a missing token that would help future pages), they'll be listed in a "Future additions" appendix rather than added now.
- File lives at `docs/DESIGN_SYSTEM.md` so it ships with the repo but doesn't affect the build.

## Out of scope

- No Storybook, no MDX, no live component gallery route.
- No refactor of existing landing components.
- No dark-mode audit (dark tokens exist but the landing page is light-only today).
