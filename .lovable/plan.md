## Watchlist filter dropdown selection logic

Fix the "Categories" and "Grades" multi-select dropdowns in `src/routes/_authenticated/app/watchlist.tsx` so "All" and specific options behave as spec.

### State model (unchanged internally)
Keep `catFilters: Set<Category>` and `tierFilters: Set<Tier>`.
- `size === 0` → "All" state (no narrowing).
- `size === options.length` (every specific checked) → also no narrowing, but visually all boxes checked and "All" unchecked.
- Otherwise → narrow to the set.

### Filter matching
Update the filter predicate so it treats "full set" the same as empty (no narrowing):
- `catFilters.size > 0 && catFilters.size < CAT_ORDER.length && !catFilters.has(r.category)` → hide.
- Same rule for `tierFilters`.

### Toggle logic (`toggleCategory` / `toggleTier`)
Rewrite both:
- If currently `size === 0` (All state) and user checks a specific option → next = `Set([option])` (only that one; All unchecks).
- Else if the set contains the option → remove it. If the result is empty → fall back to `size === 0` (All) — never leave an empty non-All state.
- Else → add it. Do NOT auto-collapse a full set back to empty; keep the full set as-is.

### "All" checkbox (`setAllCats` / `setAllTiers`)
Simplify — the "All" row acts as a radio-like action:
- Clicking "All" always sets the filter to empty set (All checked, all specific unchecked).
- Remove the `all: boolean` argument; the popover's All row calls `setAllCats()` unconditionally. Clicking "All" while already All is a no-op.

### Rendering (`FilterDropdown`)
- "All" checkbox `checked` = `selected.size === 0`.
- Specific option `checked` = `selected.has(o.value)` (NOT `size === 0 ? true : ...`).
- Summary label: `"All"` when `size === 0 || size === options.length`; otherwise 1–2 → comma list, 3+ → `"<first> +<n-1>"`. (Matches current logic — just ensure the full-set case still returns "All", which it does.)

### Analytics
`emitFilterChanged` keeps sending `[...set]`; unchanged.

### Testable outcomes (from spec)
1. All checked + click Watches → set = {Watches}; only Watches checked; list narrows.
2. Click All → set = ∅; all specific unchecked; full list.
3. From ∅, check Watches, Jewelry, Bags one-by-one → set stays {W,J,B}; All unchecked; list unfiltered (full-set bypass in predicate).
4. Uncheck the last remaining specific → set falls back to ∅ (All).

### Files
- `src/routes/_authenticated/app/watchlist.tsx` — only file touched. Business/data wiring untouched.
