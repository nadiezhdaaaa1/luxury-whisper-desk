Add a guard that prevents a user from skipping the last category when they have zero brands picked across all categories.

### What will change
- `src/components/quiz-v3/QuizFlowV3.tsx`

### Implementation
1. Detect the last category step in `next()`:
   - When `current.kind === "brands"` and the next step is `"role"`, the current category is the last one for this user.
2. When the user presses the primary CTA on that last category and `currentCatPicks === 0` and `answers.brands.length === 0`:
   - Show an inline alert with the exact text: "Pick at least one brand from any category to add to your watchlist".
   - Do not advance to the role step.
3. Use an inline alert/banner style consistent with the existing global cap alert (primary-colored background, white text, clear message).
4. Clear the alert automatically when:
   - The user picks at least one brand in the current category.
   - The user navigates back to a previous step.
   - The category changes.

### User-facing behavior
- On the final brand-picking screen, the primary button still reads "Skip the category" while nothing is picked.
- Clicking it when no brands exist anywhere in the watchlist shows the inline alert and keeps the user on the same step.
- As soon as the user picks any brand, the button changes to "Continue" and the alert disappears.

### Technical detail
- Introduce a small piece of React state (e.g., `showZeroBrandsAlert`) to track when the skip attempt happened.
- Compute `isLastCategory` via the step list: the current step is the last category if `steps[stepIndex + 1]?.kind === "role"`.