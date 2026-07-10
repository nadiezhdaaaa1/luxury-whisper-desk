# Free-plan cap swap + unified enforcement

## 1. Constants (single source of truth)

- `src/lib/portfolio.ts`: `FREE_PORTFOLIO_CAP = 3` (was 10).
- `src/lib/watchlist.ts`: `FREE_ACTIVE_CAP = 10` (was 3). Both stay as single editable exports; every screen imports them.
- Entitlement continues to read `profiles.plan` via existing `activeCapFor` / `portfolioCapFor` / `splitPortfolioByPlan` / `readOnlyPortfolioIds` helpers (no new sources).

## 2. Copy sweep (no old numbers left)

- `src/components/landing/Pricing.tsx` Free bullets → "Up to 3 portfolio items", "Up to 10 watchlist items".
- `src/components/landing/Features.tsx` → "Up to 3 portfolio items and 10 watchlist items — free, forever."
- `src/lib/subscription.ts` `PLAN_DEFS.free.benefits` → same 3 / 10 wording (this is what Settings + Upgrade both read, so the Settings copy at line 125 auto-updates; also revise the free-plan sub-copy string itself to reference the constants via template so future edits stay in one file).
- `src/routes/_authenticated/app/settings.tsx` line 125 fallback string and line 191 downgrade dialog copy → "portfolio items beyond the first 3 become read-only, watchlist items beyond the first 10 move to Paused". Line 52 toast unchanged in meaning but re-worded to match.
- `src/routes/_authenticated/app/portfolio.tsx` burgundy banner and Free-limit-reached screen already interpolate `FREE_PORTFOLIO_CAP` — will now read 3 automatically; verify final strings match spec ("Free accounts have a 3-item limit. Upgrade to keep tracking all of them. Upgrade").
- `src/routes/_authenticated/app/watchlist.tsx` burgundy banner already interpolates `FREE_ACTIVE_CAP` — will read 10 automatically; final string: "Free accounts have a 10 watchlist-item limit. Upgrade to keep tracking all of them. Upgrade".
- Grep pass for any remaining hard-coded "10 portfolio", "3 watchlist", "3-item", "10-item", "first 3", "first 10" — remediate.

## 3. Watchlist: switch from auto-spill to block-on-add

Current Watchlist silently inserts new items as `is_active:false` once at cap. Change so a Free user at cap is blocked exactly like Portfolio.

`src/routes/_authenticated/app/watchlist.tsx`:
- Add a `freeLimitOpen` modal (mirror Portfolio's "You've reached the Free limit" screen, cap = 10).
- `handleAddBrands`: if `plan === "free"` and `activeRows.length + picks.length > FREE_ACTIVE_CAP`, do NOT insert — open the upsell modal, fire `watchlist_free_limit_reached`, return. Otherwise insert all as `is_active:true` (no more `activeCount + i < activeCap` spill math).
- `handleAddPiece`: same guard for +1; always insert `is_active:true` when allowed.
- `AddBrandModal` / `AddPieceModal` triggers: when Free + at cap, open the free-limit modal instead of the add modal (matches Portfolio's `openAddOrLimit` pattern).
- Auto-promotion on remove and re-upgrade restore already exist via `pickPromotion` + `upgradeToPro` — keep as-is.
- Paused section rendering: keep, but only appears from a Pro→Free downgrade (block-on-add prevents new paused rows).

## 4. Watchlist Paused card: reduce to untracked shape

Paused watchlist cards currently render full tracking data with `opacity-80`. Reduce them to brand + model + 3-dot menu only (no last-signal, no tier chip, no target/price UI). Portfolio's `PortfolioCard` already has a paused variant per project memory — mirror that shape.

`src/routes/_authenticated/app/watchlist.tsx`:
- `ItemCard` gets a `isPaused` branch that returns the minimal layout (brand/model + kebab menu with Remove). Skip `lastSignal`, tier chip, target price row, and any tracking chrome.
- `CategoryGroups` passes `isPaused` through unchanged.

## 5. Portfolio: cap-swap only

Behavior already matches spec (block-on-add via `handleFreeLimitOpen`, downgrade produces Paused via `splitPortfolioByPlan`, totals count Active only via `readOnlyPortfolioIds`, PortfolioCard reduced when paused per memory, auto-promotion is implicit because removing an Active item shifts the split). Only the constant changes; verify Free-limit-reached copy still reads correctly at N=3.

## 6. Downgrade path

`src/lib/subscription.ts` `downgradeToFree`:
- Watchlist branch already keeps oldest `FREE_ACTIVE_CAP` active and pauses the rest — with the new cap 10 that Just Works.
- Portfolio is derived (no `is_active` column) via `splitPortfolioByPlan` — cap swap makes over-3 items paused automatically.
- Re-upgrade already reactivates all watchlist rows; portfolio derivation flips back to all-Active. No changes needed here.

## 7. Quiz Step 2: hard cap 10 with live guidance

`src/components/quiz/QuizFlow.tsx`:
- Add `QUIZ_BRAND_CAP = FREE_ACTIVE_CAP` (import from `@/lib/watchlist`) so the constant travels.
- `canProceed` on step 2: require `answers.brands.length > 0 && answers.brands.length <= QUIZ_BRAND_CAP`.
- Replace step-2 helper string ("Pick at least one category and one brand.") with dynamic text:
  - 0 brands: existing prompt.
  - 1–10: hidden.
  - >10: calm burgundy/muted message rendered directly under the "Brands (N)" chips row (line ~490–514 area), e.g. `You can watch ${QUIZ_BRAND_CAP} brands on the free plan — remove ${brands.length - QUIZ_BRAND_CAP} to continue`. Styling: `text-sm text-[hsl(var(--primary))]/90` on a muted surface, not destructive red.
- Chip removal already exists — count and message update on each toggle; Continue re-enables the instant count hits 10.
- Seeding: no change needed. `planSeedFromProfile(..., FREE_ACTIVE_CAP, ...)` now marks all ≤10 seeds as `is_active:true`.

## 8. Verification

- Typecheck (`bunx tsgo --noEmit`).
- Manual grep for "Up to 10 portfolio", "Up to 3 watchlist", "3 watchlist", "10 portfolio" — must return nothing.
- Playwright smoke: (a) Free user adds 11th watchlist item → upsell modal, no DB insert; (b) Free user adds 4th portfolio item → existing upsell; (c) simulate Pro→Free with >cap rows → Paused section + banner + reduced cards + totals unchanged; (d) quiz select 11 brands → Continue disabled + burgundy message, deselect one → enabled.

## Files touched

- `src/lib/portfolio.ts` — cap 10→3.
- `src/lib/watchlist.ts` — cap 3→10.
- `src/lib/subscription.ts` — Free `benefits` copy.
- `src/components/landing/Pricing.tsx`, `src/components/landing/Features.tsx` — copy.
- `src/routes/_authenticated/app/settings.tsx` — copy.
- `src/routes/_authenticated/app/watchlist.tsx` — block-on-add + reduced paused card.
- `src/routes/_authenticated/app/portfolio.tsx` — copy check only.
- `src/components/quiz/QuizFlow.tsx` — hard cap + live guidance.
