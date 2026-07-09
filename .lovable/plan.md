Goal: Bring the AddEditPortfolioModal input fields into full parity with the Watchlist "Add a piece" window.

Changes
1. Extract SearchableSelect
   - Move the inline `SearchableSelect` component from `src/components/watchlist/AddPieceModal.tsx` to a reusable file, e.g. `src/components/ui/searchable-select.tsx`.
   - Update `AddPieceModal.tsx` to import and use the shared component.

2. Replace Brand and Piece / Model inputs in AddEditPortfolioModal
   - Swap the current `<Input list="...">` + `<datalist>` pattern for Brand and Piece / Model with the shared `<SearchableSelect>`.
   - Wire up the same catalog/model queries already used in the modal.

3. Update Category selection
   - Replace the native `<Select>` dropdown with the same three category tabs used in "Add a piece" (Watches / Jewelry / Bags).
   - Selecting a tab resets Brand and Model, matching "Add a piece" behavior.

4. Unify input styling
   - Apply the "Add a piece" field look everywhere: `h-12`, `rounded-[16px]`, `bg-white`, appropriate horizontal padding.
   - Purchase price and alert target MoneyInputs: use `[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9`.
   - Notes textarea: keep `min-h-[72px]`, add `bg-white` and `px-5` to align with other fields.

5. Optional modal shell alignment
   - If desired, update `DialogContent` background to `bg-[#FCFAF6]` and remove the border to match the "Add a piece" modal shell.

6. Verification
   - Open the portfolio "Add to my portfolio" / "Edit piece" modal and confirm fields visually match the Watchlist "Add a piece" window.
   - Test brand/model search and category tab switching still work for both add and edit flows.

No backend or data-model changes are needed.