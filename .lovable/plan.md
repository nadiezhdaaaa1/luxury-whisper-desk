## Delay the scroll reveal animation

Currently sections fade in as soon as ~15% enters the viewport (with a slight -5% bottom margin). This fires quite early — often before the user has really scrolled the section into view.

### Change

In `src/components/landing/Reveal.tsx`, tighten the IntersectionObserver so the reveal triggers later on scroll:

- Change `rootMargin` from `"0px 0px -5% 0px"` to `"0px 0px -20% 0px"` — requires the section to be ~20% further up before firing.
- Bump `threshold` from `0.15` to `0.2` — more of the section must be visible.

Net effect: sections start their fade + rise animation noticeably later, once they're properly scrolled into view rather than just peeking in.

No other files change.