# Fix: first press on a button is ignored

## What is actually happening

This is not a hydration or "app not ready" problem, and it is not specific to the quiz. I reproduced it in the browser against the running app.

Every button in the design system shrinks slightly while it is held down (`transform: scale(0.965)` on `:active`). When you press near the edge of a button, the button shrinks *away from under your cursor* before you release. The release then lands outside the button, so the browser never fires a click — the press is silently swallowed. Pressing again "works" because by then the cursor is usually sitting a little further inside.

Reproduction on the quiz intro step ("Let's go"):

```text
press at button centre      -> advances to step 2
press 2px inside left edge  -> advances to step 2
press 2px inside top edge   -> advances to step 2
press 2px inside right edge -> NOTHING HAPPENS   <-- the bug
```

The shrink removes ~2.5px from each side and ~0.8px from top and bottom, which matches exactly where the dead zone is. Because the same press animation is on every button style, this explains the "sometimes it happens with other buttons as well" part too.

## The fix

Keep the press animation — it is part of the feel of the product — but stop it from shrinking the clickable area. Each pressable button gets an invisible hit surface a few pixels larger than the button itself, sitting inside the button so it scales along with it. Pressed or not, the area under your cursor still belongs to the button, so the release always registers.

This is a purely presentational change: no button behaviour, wording, layout, spacing or visual appearance changes, and nothing in the quiz logic is touched.

## Where it applies

The press-shrink exists in seven places, all of which get the same treatment:

- The six button utilities in `src/styles.css`: `btn-primary`, `btn-secondary`, `btn-tertiary`, `btn-destructive`, `btn-on-navy`, `btn-ghost-navy`
- The shared shadcn `Button` component (`src/components/ui/button.tsx`), which carries `active:scale-[0.965]` on its base class

The one-off icon button in `ImportantSignalCard.tsx` uses `active:scale-95` on a 44px round target; it gets the same compensation so the behaviour is consistent everywhere.

## Technical detail

Add to each pressable utility a hit-area pseudo-element:

```css
&::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: inherit;
}
```

The utilities are already `position: relative`, none of them use `::after` today, and none set `overflow: hidden`, so nothing is clipped or overwritten. `-4px` covers the worst case (the tallest/widest buttons lose under 3px per side) without extending far enough to overlap a neighbouring control — the tightest button pair in the app sits at a 12px gap.

For the shadcn `Button`, the same thing expressed as utilities on the base class: `after:absolute after:-inset-1 after:rounded-[inherit] after:content-['']`, and `active:scale-100` variants (e.g. `link`) are left alone.

## Verification

- Re-run the edge-press check on the quiz "Let's go" button: all four positions (centre and 2px inside each edge) must advance the step on the first press.
- Repeat on a `btn-secondary` ("Back"), a `btn-tertiary` ("Back to site") and a shadcn `Button` in a dialog.
- Confirm the press animation still plays and that hover, focus ring, glow and the touch ripple are unchanged.
