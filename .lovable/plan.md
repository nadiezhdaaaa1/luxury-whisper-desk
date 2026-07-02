# Cursor-reactive polka dot spotlight on the hero

Add a subtle polka-dot pattern that appears on the hero background around the cursor, but only when the cursor is close to the bento grid panel's border. Away from the block, the background stays clean.

## Behavior

- Pattern lives on a full-size layer behind the bento grid (inside the hero section, under the panel).
- A radial mask centered on the cursor reveals the dots (~180px soft radius).
- A second mask fades the effect based on distance from the bento panel's edge: fully visible within ~40px of the border, invisible beyond ~160px. Inside the panel itself the dots stay hidden so cards keep their clean surface.
- Effect disables on touch devices and respects `prefers-reduced-motion` (dots fade in statically around the panel border instead of tracking the cursor).

## Visual

- Dots: 2px circles on a 16px grid, color `rgba(0, 0, 0, 0.18)` so they read on the ivory background without competing with the cards.
- Rendered as a CSS `radial-gradient` background on a fixed layer, so no DOM/list of dots.
- Smooth follow: cursor position updated via `requestAnimationFrame` with light lerp for a soft trailing feel.

## Technical

- New file `src/components/landing/HeroDotField.tsx`: client component that
  - measures the bento panel via a `ref` passed from `Hero.tsx`
  - listens to `mousemove` on the hero section
  - writes `--x`, `--y`, and `--edge` CSS variables on the layer
  - renders one absolutely-positioned div with the polka-dot gradient and a `mask-image: radial-gradient(...)` driven by those vars
- Update `src/components/landing/Hero.tsx`:
  - add a ref on the `rounded-[40px]` panel
  - mount `<HeroDotField panelRef={panelRef} />` inside the hero section, positioned absolutely at `inset-0` with `z-0` (bento panel stays at `z-10`)
- No new dependencies.

## Out of scope

- No changes to the bento cards, tags, or existing hero content.
- No global cursor changes elsewhere on the page.
