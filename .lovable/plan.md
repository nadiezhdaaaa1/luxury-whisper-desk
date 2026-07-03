Restructure the Step 1 visual card into two chip sections separated by a divider:

**Section 1 — Categories**
- Chips: "Watches" (selected), "Jewelry" (unselected)

**Separator**
- Thin horizontal hairline between the two sections

**Section 2 — Watch brands**
- Chips: "Tissot" (selected), "Rolex" (unselected)

Selected chips keep the dark pill with check icon; unselected keep the light pill with empty circle. Same card size and styling (`card-soft`, `h-[180px]`) so the three-step layout stays aligned.

### Technical notes
In `src/components/landing/HowItWorks.tsx`:
- Replace the single `chips` array with two arrays (`categories`, `brands`).
- Rewrite `Step1Visual` to render two `flex-wrap` chip rows with a `border-t border-hairline` divider (with vertical padding) between them.
- Reuse the existing chip class logic.