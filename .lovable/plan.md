# Fix registration-modal close ownership

## Scope
- Add temporary diagnostics at the registration dialog callback, plan-flow close callback, and provider render.
- Exercise the close button against a production build and compare the callback/render sequence.
- If the parent-owned state fails to close the rendered dialog, let the registration dialog close itself immediately while retaining the parent callback for intent and lifecycle coordination.
- Do not alter Escape handling, cookie preferences, checkout/auth logic, or plan-intent persistence.

## Verification
- Build the production artifact and inspect the emitted route bundle for the diagnostics/fix.
- Serve that artifact over HTTP and verify the registration X closes the only dialog, restores body interaction/scroll, preserves the plan intent, and does not navigate.
- Confirm the production trace identifies which callbacks fired and the next provider `modalOpen` value.
