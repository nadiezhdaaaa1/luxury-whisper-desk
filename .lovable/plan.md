Add a reusable scroll-triggered "appear on view" animation and apply it to each landing section (except Hero, which keeps its existing intro).

## New component

Create `src/components/landing/Reveal.tsx` — a small wrapper using `IntersectionObserver` (no new deps):
- Adds `opacity-0 translate-y-4` initially, transitions to `opacity-100 translate-y-0` on first intersection with `~15%` threshold.
- Uses ~600ms ease-out; respects `prefers-reduced-motion` (renders visible immediately).
- Fires once (unobserves after reveal) so re-scrolling doesn't re-trigger.
- Accepts optional `delay` prop for staggering.

## Apply to sections

In `src/routes/index.tsx`, wrap each non-Hero section in `<Reveal>`:
- BrandMarquee, ProblemSection, HowItWorks, Features, Categories, Audience, Comparison, Pricing, FAQ, FinalCTA.

Hero stays untouched. AnnouncementBar, Navbar, Footer stay untouched.

## Notes

- No framer-motion added; pure CSS transitions + IntersectionObserver keeps bundle lean and matches the existing lightweight motion approach (ParticleField, DotWatch use plain canvas/JS).
- Uniform section-level reveal only — no per-child staggering inside sections in this pass.