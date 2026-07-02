## Change
In `src/components/landing/Hero.tsx` at line 70, wrap the bento grid container with a translucent frame:
- Add `bg-black/[0.04]` (black at 4% opacity) and `rounded-3xl` to a wrapper.
- Give the wrapper `p-8` (32px) padding on all sides so the cards sit inset by 32px.
- Keep `max-w-5xl mx-auto` on the wrapper so the outer frame follows the grid width; the inner grid retains `grid grid-cols-1 md:grid-cols-6 gap-4`.

No other sections or card styles change.
