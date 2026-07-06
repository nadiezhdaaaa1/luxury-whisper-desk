## Goal
Make Reveal-wrapped sections start their fade/rise animation earlier during scroll, so content is more visible by the time it settles.

## Change
Edit `src/components/landing/Reveal.tsx` IntersectionObserver options:
- Lower `threshold` from `0.15` → `0`
- Change `rootMargin` from `"0px 0px -5% 0px"` → `"0px 0px -15% 0px"` (triggers when the section is ~15% below the viewport bottom, i.e. before it fully enters)

This makes each section start animating in sooner, so it's more visible/settled by the time the user scrolls to it. No visual change to duration, easing, or distance.