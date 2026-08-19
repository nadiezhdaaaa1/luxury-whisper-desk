# PriceYou — Product Audit

**Run:** 19 Aug 2026 (UTC). **Scope of this pass:** every source of data the product
displays to a user, classified by whether it is real. Read-only audit — no code was
changed to produce it.

This document is structured to be appended to. Pass 1 (real vs mock) is below;
passes 2–4 will be added as further sections.

## Method

- Grepped `src/` for `mock`, `demo`, `sample`, `fake`, `stub`, `placeholder`, `TODO`,
  `FIXME`, `hardcode` and traced every hit to a consumer and a screen. Filenames were
  not trusted — import graphs were.
- Queried the database directly for row counts, `is_sample` distribution, and table
  usage, rather than inferring from the type definitions.

## Legend

| Class | Meaning |
| --- | --- |
| **Live** | Real data from the database or a real service. |
| **User-supplied** | The user's own input, echoed back. |
| **Demo** | Deliberately fake, and labelled as such where the user can see it. |
| **Silently mock** | Fake, and not disclosed to the user. |
| **Hardcoded** | Literal values in source presented as information. |

Each item is marked **confirmed** (traced end to end) or **unverified** (with the reason).

---

# Section 1 — Real vs mock

## 1.1 Actively misleading (money, data, or capability)

These are separated out because a user forms a false belief about their own money or
about what the product can do. Everything here is **confirmed** unless stated.

### M1 — Portfolio market values are randomly generated

- **File:** `src/lib/demo-market-prices.ts` (`getMockMarketPrice`, `getMockBrandTrend`,
  `summarizeMarket`).
- **Feeds:** every "current market price", high/low range, and market total in the app.
- **Screens:** `/app/portfolio` (each `PortfolioCard`, `PortfolioBreakdown` totals),
  `/app/watchlist` (per-piece current price), and indirectly the whole dashboard.
- **Disclosure:** none on portfolio. The only disclosure anywhere in the app is the
  string `Demo data — indicative only` on the *watchlist brand-trend chip*
  (`watchlist.tsx:1186`). `PortfolioBreakdown` instead tells the user these are the
  "Current estimated resale price of your pieces based on market demand and …", which
  asserts a market-derived figure that does not exist.
- **What's true:** a seeded PRNG anchored on the user's own purchase price, re-salted
  per browser session (`SESSION_SALT`), so the number changes on reload.
- **Belief vs truth:** the user believes they are seeing what their items are worth
  today. They are seeing a random walk around what they paid.
- **To become real:** a pricing feed keyed by brand/model/reference, plus a currency
  and condition model. The module is isolated, so it is one import swap per consumer.

### M2 — Portfolio value history and gain/loss are synthetic

- **Files:** `src/lib/demo-price-history.ts` (400-day series), `src/lib/demo-movers.ts`.
- **Feeds:** the value chart, period deltas (week/month/quarter/year/all/custom),
  category donut splits, and the top gainers/losers list.
- **Screens:** `/app/` dashboard — `ValueCard`, `PeriodFilter`, `CategoryDonutCard`,
  `InsightsCard`.
- **Disclosure:** none on any dashboard surface.
- **What's true:** a gaussian random walk with a per-item upward drift of 0.02–0.09 %
  per day, anchored so today's point equals the M1 random price. The upward drift means
  long windows read green by construction.
- **Belief vs truth:** the user believes the chart is their portfolio's realised
  performance and the "+X % this year" is their return. It is a generator biased to
  show gains.
- **To become real:** historical price series per item; the period-slicing maths in
  `sliceForPeriod` is reusable as-is.

### M3 — Every price alert in the database is a sample row, undisclosed

- **Table:** `public.signals` — 424 rows, **424 of them `is_sample = true`**
  (confirmed by query; there are no non-sample rows). Types: 167 `price_increase`,
  98 `new_collection`, 94 `discount`, 65 `drop`. All 424 have a `source_url` pointing
  at a real brand domain (cartier.com, louisvuitton.com, …).
- **Feeds:** `/app/signals`, the dashboard "Latest price alerts" tile and its counters.
- **Disclosure:** **none.** `is_sample` is fetched nowhere in `src/` — no query selects
  it and no component branches on it. The cards carry real-looking brand source
  hostnames, and the only caveat shown is "Price alerts are estimates, not investment
  advice."
- **Belief vs truth:** the user believes a named retailer changed a price on the date
  shown. Nothing was observed; the rows were authored.
- **To become real:** the source parser this handover is about. `is_sample` already
  exists as the provenance flag — gate display or badge on it.

### M4 — Subscription lifecycle is browser-local, not billing

- **File:** `src/lib/subscription-mock.ts` (localStorage, key `subMock:<userId>`).
- **Feeds:** scheduled-cancellation state, cancel reason/note, retention-offer
  acceptance.
- **Screens:** `/app/settings` (plan section), `CancelSubscriptionDialog`.
- **Disclosure:** none in the dialog flow. The user completes a cancellation and is
  told it is scheduled.
- **What's true:** a JSON blob in that one browser. Clearing site data or switching
  device erases the cancellation; no server, no provider, no email.
- **Belief vs truth:** the user believes they have cancelled a paid subscription.
- **Mitigating fact (confirmed):** `BillingCard` deliberately shows no card, invoice, or
  next-charge date, and says "Payments are being set up." So no *charge* is
  misrepresented — but the cancellation outcome is.
- **To become real:** a billing provider plus a subscription table; `profiles.plan` is
  already locked server-side by the `enforce_plan_immutable` trigger.

### M5 — "Emails" are console logs and toasts

- **File:** `src/lib/notifications-mock.ts` (`sendMockEmail`, log key
  `lux.notifications.log.v1`).
- **Feeds:** all 16 templates — verification, password reset, price alerts, weekly
  digest, payment failed, subscription canceled/renewed, deletion scheduled, etc.
- **Screens:** `/app/settings` (`NotificationPreferencesCard`, `AlertDeliveryCard`),
  triggered from `DeleteAccountDialog` and `CancelSubscriptionDialog`.
- **Disclosure:** the opposite — a success toast reading `Email sent · <template>` with
  the user's address as the description.
- **Belief vs truth:** the user believes an email was delivered. Nothing left the
  browser. Notification preferences and quiet hours also persist only in localStorage,
  so they do not follow the account.
- **Exception (confirmed live):** Supabase auth emails (signup confirmation, password
  reset, OTP) are real and unrelated to this module.
- **To become real:** a transactional email provider and server-side preference storage.

## 1.2 Ordinary scaffolding

| # | Item | File | Feeds / screens | Class | Disclosed? | To become real |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Analytics dispatch | `src/lib/analytics.ts` | all `track()` calls | **Silently mock** | n/a (not user-facing) | Both vendor seams are empty (`void name; void props`) behind a correct consent gate; events only reach `console.log`. Add SDK calls inside the two dispatch functions. |
| S2 | Muted alert sources | `src/lib/muted-sources.ts` | mute control on signal cards, `MutedAlertSourcesCard` | **Silently mock** | no | Filtering genuinely works (via `useSignals`), but the mute list is localStorage-only, so it is per-browser and lost on clear. Needs a table. |
| S3 | Quiet hours / alert delivery | `src/lib/alert-delivery.ts` | `AlertDeliveryCard` (Pro) | **Silently mock** | no | localStorage; evaluated against the browser clock (documented in-file). Needs server-side scheduling — it can only shape mock emails today. |
| S4 | Aha-screen collection value | `BASE_BRAND_VALUES` in `src/lib/quiz-v3.ts` (mirrored in `src/lib/quiz.ts`) | value range + "Starter/Mature" meter on the quiz reveal | **Hardcoded** | partly — "A rough estimate of what a collection in your brands is worth at typical entry prices." | A hand-written low/high per brand (Rolex 12k–22k, Richard Mille 160k–300k …) scaled by a multiplier, with a category fallback for unknown brands. Honest as a *typical entry price*, but the numbers are authored, not sourced. Replace with catalog-derived reference prices. |
| S5 | Pricing amounts | `PLAN_DEFS` in `src/lib/subscription.ts`, `MONTHLY_USD`/`ANNUAL_USD` in `billing-mock.ts` | landing pricing, settings plans | **Hardcoded** | n/a — these are the real intended prices | Should come from the billing provider's price objects once checkout exists. |
| S6 | Plan transitions | `upgradeToPro` / `downgradeToFree`, `src/lib/subscription.ts` | settings plan buttons (currently `disabled`) | **Silently mock** | buttons are disabled, so not reachable | Direct `profiles.plan` writes with no payment; the DB trigger now rejects them from the client anyway. Replace with checkout + webhook. |
| S7 | Watchlist brand trend chip | `getMockBrandTrend`, `demo-market-prices.ts` | `/app/watchlist` YoY/QoQ chip | **Demo** | **yes** — "Demo data — indicative only" | The only correctly-labelled fake in the product. Needs a brand price index. |
| S8 | Onboarding watchlist seed | `src/hooks/use-seed-watchlist.ts` | first `/app/watchlist` load | **User-supplied** | n/a | Writes the brands the user actually picked in the quiz. Real rows, real ownership — not a mock. |

### Dead code (reaches no screen) — confirmed

- **`src/lib/billing-mock.ts`** — `MOCK_PAYMENT_METHOD` (Visa •4242), `getMockInvoices`,
  `getNextCharge`. **No component imports it**; its only inbound edge is its own import
  of `subscription-mock`. `BillingCard` was deliberately rewritten to show none of it.
  A fake saved card and invoice history exist in the source but are not displayed.
  Worth deleting so no one re-wires it by accident.
- **`getMockInvoices` / `formatInvoiceDate` / `formatUsd`** — same file, same status
  (`formatUsd` is not re-exported elsewhere).

## 1.3 Genuinely live — confirmed

| Source | Table / service | Screens |
| --- | --- | --- |
| Brand & model catalog | `brands` (91), `models` (304) — real brand names/tiers, anon-readable | quiz, watchlist add, portfolio add, filters |
| Portfolio items | `portfolio_items` (9) | `/app/portfolio` — **User-supplied**: brand, model, purchase price, year, notes, photo |
| Watchlist | `watchlist` (90) | `/app/watchlist` — **User-supplied** |
| Profiles & entitlement | `profiles` (16: 10 free, 6 pro) | settings, gating |
| Blog | `posts` (10, all published) | `/blog`, `/blog/$slug` |
| Photo recognition | `portfolio-recognize.functions.ts` → Lovable AI Gateway vision | add-portfolio-item modal — a real model call returning an editable suggestion |
| Contact form | `contact_submissions` (1) | `/contact` — real insert |
| Newsletter | `newsletter_subscribers` (1) | blog signup — real insert |
| Account deletion | `account_deletion_requests` (0), `_runs` (4), `_dispatches` (1) + cron | settings, `PendingDeletionBanner` — real server-side flow |
| Auth | Supabase auth (incl. its own emails) | login, signup, reset, OTP |
| Free-tier caps | DB triggers | portfolio (3) / watchlist (10) enforced server-side |

## 1.4 Database inventory

| Table | Rows | Nature |
| --- | --- | --- |
| `brands` | 91 | real reference data |
| `models` | 304 | real reference data |
| `signals` | 424 | **100 % `is_sample = true`** — authored sample data (see M3) |
| `posts` | 10 | real content, all published |
| `profiles` | 16 | real users |
| `watchlist` | 90 | real user data |
| `portfolio_items` | 9 | real user data |
| `account_deletion_runs` | 4 | real cron history |
| `account_deletion_dispatches` | 1 | real |
| `account_deletion_requests` | 0 | empty, wired |
| `contact_submissions` | 1 | real |
| `newsletter_subscribers` | 1 | real |
| `portfolio_removals` | 0 | empty, wired (insert-only, RLS-restricted) |
| `user_roles` | 0 | empty |
| `account_deletion_health` | — | VIEW, not a table |

`signals` is the only table carrying seed/sample content — confirmed by querying
`is_sample` across the schema; no other table has a provenance flag, and the rest hold
either real reference data or real user rows.

**Tables not referenced by application code:**

- `user_roles` — zero app references and zero rows. It is not unused overall: the
  `has_role()` security-definer function reads it inside RLS policies on `posts`,
  `contact_submissions`, and the deletion tables. With no rows, no admin surface is
  reachable today.
- `account_deletion_dispatches` — never queried from `src/`; written and reconciled
  entirely in SQL/cron and read by the `account_deletion_health` view.

## 1.5 Unverified

- **Whether the `signals` sample rows were derived from real observed prices at
  authoring time.** The content looks plausible and every row carries a genuine brand
  URL, but there is no ingestion record, timestamp provenance, or parser in the
  repository, so origin cannot be established from inside the project.
- **Whether any Supabase auth email templates have been customised.** The templates are
  configured outside the codebase and were not inspected in this pass.
- **Real-world accuracy of `BASE_BRAND_VALUES`.** Classified as hardcoded on the basis
  that it is a literal table in source; whether the ranges are market-accurate was not
  checked against any external source.
