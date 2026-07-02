Shrink the cursor spotlight radius on the hero dot field.

In `src/components/landing/HeroDotField.tsx`, reduce the mask radial-gradient from `180px circle` to `110px circle` (both `WebkitMaskImage` and `maskImage`), keeping the same soft falloff stops.