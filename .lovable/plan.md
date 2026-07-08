## Replace catalog data + drop the "premium" tier

Clean data swap: keep the `brands` / `models` tables and every screen that reads from them; only the rows and the tier enum shrink from four values to three.

### 1. Data migration (single SQL migration)

- `TRUNCATE public.models, public.brands RESTART IDENTITY CASCADE;` — clean replace, no merge.
- Re-insert **91 brands** from `brands-2.csv` into `brands(slug, name, category, tier)`.
- Re-insert **~304 models** from `models-2.csv` into `models(brand_slug, name)`, FK to the new brands.
- If `brands.tier` is a Postgres enum, drop the old `premium` value by rebuilding the type to `('luxury_invest','mid_market','mass_market')` before insert. If it's plain `text`, add a `CHECK (tier IN ('luxury_invest','mid_market','mass_market'))`.
- No changes to `watchlist` / `portfolio_items` — every slug in the new CSV already exists (Cartier stays split as `cartier-watches` + `cartier-jewelry`), so existing user rows keep resolving.

### 2. Code changes — remove every "premium" reference

- `src/lib/catalog.ts`
  - `Tier = "luxury_invest" | "mid_market" | "mass_market"`
  - `TIERS = ["luxury_invest","mid_market","mass_market"]`
  - Drop `premium` from `TIER_LABELS`.
  - `tiersForSegment`: `luxury_invest → [luxury_invest]`, `mid_market → [mid_market]`, `mass_market → [mass_market]` (1:1 now that segments and tiers align).
- `src/lib/watchlist.ts` — drop `premium` from local `TIER_LABELS`.
- `src/lib/quiz.ts` — `CatalogTier` and `TIER_MULTIPLIER` lose `premium` (keep 1.4 / 1.0 / 0.6).
- `src/components/quiz/AhaReveal.tsx` — narrow the inline tier union to the three values.

No UI wiring changes: `AddBrandModal`, `AddPieceModal`, `AddEditPortfolioModal`, `QuizFlow` Step 2, and Portfolio/Watchlist filters already iterate `TIERS` and query the catalog — they'll show three chips automatically and reflect the new brand/model rows.

### 3. Verification

After the migration and code edits:
- `select count(*) from brands` → 91; `select count(*) from models` → ~304; `select distinct tier from brands` → exactly the three values.
- Spot-check the requested slices: Watches+luxury_invest includes Rolex/Patek/Omega/Cartier; Watches+mid_market includes TAG Heuer/Tudor/Longines; Bags+luxury_invest includes Hermès/Chanel/LV/Dior/Goyard.
- In the running app: Add-a-brand modal and quiz Step 2 show three tier chips; picking Rolex in Add-a-piece loads Submariner/Daytona/GMT-Master II/…; Cartier still appears twice (Watches / Jewelry).

### Order of operations

1. Run the migration (requires approval) — this also regenerates `src/integrations/supabase/types.ts`.
2. Apply the code edits above in one batch (they depend on the new enum shape).
