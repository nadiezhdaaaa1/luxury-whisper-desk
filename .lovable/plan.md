I found the likely cause: the icon is absolutely positioned inside the same `relative` wrapper that also grows when search results appear. When the input becomes active and results render below it, the wrapper height changes, so `top-1/2` recalculates against the taller container and the icon moves downward.

Plan:
1. In `src/components/quiz-v3/QuizFlowV3.tsx`, split the search input into its own fixed-height relative wrapper.
2. Keep the search icon positioned relative only to the 48px input row, not the full search section/results area.
3. Leave the search results dropdown styling and behavior unchanged.
4. Verify the icon remains vertically centered before focus, during typing, and while results are visible.