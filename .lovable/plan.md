## Portfolio screen — implementation plan

### 1. Database (single migration)

Create `public.portfolio_items` (extends existing `category_kind` enum) with:
- `user_id`, `category`, `brand`, `model`, `photo_url`, `notes`
- `purchase_price numeric`, `currency text default 'USD'`
- `signal_every_move bool default false`
- `alert_below_enabled bool default false`, `alert_below_price numeric`
- `alert_above_enabled bool default false`, `alert_above_price numeric`
- `created_at`, `updated_at` + updated_at trigger
- GRANTs to `authenticated` + `service_role`, RLS enabled, 4 policies scoped to `auth.uid() = user_id`

Storage bucket `portfolio-photos` (private) with per-user folder RLS policies (`(storage.foldername(name))[1] = auth.uid()::text`).

### 2. New library files

- **`src/lib/portfolio.ts`** — `PortfolioRow` type, `fetchPortfolio()`, `insertPortfolioItem()`, `updatePortfolioItem()`, `deletePortfolioItem()`, `uploadPortfolioPhoto(file)`, `FREE_PORTFOLIO_CAP = 10`.
- **`src/lib/portfolio-recognize.functions.ts`** — `recognizePortfolioPhoto` server fn using Lovable AI Gateway (`google/gemini-3.1-flash-image` vision → structured JSON `{category, brand, model, confidence}`). Returns suggestion or null on low confidence.

### 3. New components

- **`src/components/ui/MoneyInput.tsx`** — reusable `$`-prefixed numeric input. Applied on portfolio + retrofitted into `AddPieceModal.tsx` (Watchlist target price) and Watchlist inline target editor.
- **`src/components/portfolio/AddEditPortfolioModal.tsx`** — photo dropzone → AI recognition → editable Category/Brand/Model, `MoneyInput` for purchase price, notes textarea, 3 alert switches with revealed `MoneyInput` fields. Reused for edit.
- **`src/components/portfolio/PortfolioCard.tsx`** — photo, brand+model, "Last signal — no signals yet", "Current market price: coming soon", user's set targets (no gap rows), 3-dot menu (Edit/Remove).
- **`src/components/portfolio/TotalValueHeader.tsx`** — hero number = sum of purchase_prices; coverage note "Based on N of M items with a purchase price"; empty prompt when zero priced; muted "Live market valuation coming soon" line.

### 4. Route

Rewrite `src/routes/_authenticated/app/portfolio.tsx`:
- Loading skeleton / error / empty states
- `TotalValueHeader`
- Category filter tabs (matching Watchlist style)
- Grid of `PortfolioCard`
- Single plain "Add to my portfolio" button (no dropdown chevron)
- Remove confirm `AlertDialog`
- Free-cap upsell dialog on 11th add attempt (does not delete existing)

### 5. Analytics

Extend `src/lib/analytics.ts` `TrackEvent` union with: `portfolio_viewed`, `portfolio_item_added`, `portfolio_photo_recognized`, `portfolio_item_edited`, `portfolio_item_removed`, `portfolio_alert_set`, `portfolio_free_limit_reached`.

### 6. Guardrails honored

- No fabricated market prices, gaps, or signal timestamps
- Header labelled "Total purchase value" (sum of user entries only)
- AI recognition shown as editable suggestion with "Detected: … — edit if needed"
- 11th item blocks the add and shows upsell; existing items untouched
- `$` prefix applied to Watchlist money inputs too

Migration runs first (requires approval); then all code lands in one batch.