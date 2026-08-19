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

---

# Section 2 — Claims vs reality

**Run:** 19 Aug 2026. **Method:** every user-facing string in `src/content/legal/*.md`
(all seven files), `PLAN_DEFS`, `src/components/landing/*`, dialog/modal copy, toasts,
empty states, and contract-stating docstrings was read and traced to the implementing
code, plus direct database queries where the claim is about data.

**Classification legend**

- **True** — the code does what the claim says.
- **True of the code, false of the data** — the mechanism exists and works, but what it
  operates on is the demo/sample data inventoried in Section 1. Section 2's most common
  result; kept distinct because the fix is a data/ingestion fix, not a code fix.
- **True-but-fragile** — currently true, but held up by something undefended (a mock, a
  localStorage record, an env flag, a single un-asserted invariant).
- **False** — the claim is not implemented, or the implementation contradicts it.
- **Unverifiable** — cannot be established from inside the project.

Counts: **True 21 · True of the code, false of the data 9 · True-but-fragile 6 ·
False 14 · Unverifiable 5.**

## 2.1 Severity 1 — false statements in legal copy

Legal copy is contractual and is linked from signup. These are ordered first because a
false statement here is a different order of problem from a hopeful headline.

**L1. Account deletion is promised as permanent; the live job has never deleted anything.**
`terms.md` §13: *"Following account deletion, User Content will be deleted or anonymized
within a reasonable period, except where retention is required by law or for legitimate
business purposes."* `DeleteAccountDialog.tsx`: *"After 30 days, everything for {email} is
permanently removed — portfolio, brand watchlist, price alerts, and account."*
`privacy.md` §9 grants an erasure right.
**Reality:** the server-side path in `src/routes/api/public/run-account-deletions.ts` is
correct and complete — storage purge, newsletter delete, contact/removal-note
anonymisation, `auth.admin.deleteUser`. But every run to date executed in **dry-run**
mode: `select mode, count(*) from account_deletion_runs` returns `dry_run | 4`, most
recent `2026-08-19 03:15:02Z`. Live rows log *"would purge storage"*, not *"purged"*. The
mode is env-driven; no run has ever been live.
**Classification: False.** Mitigating: `account_deletion_requests` holds 0 rows, so no
user has yet been told 30 days and had nothing happen. The promise is unexecuted rather
than broken — for now.

**L2. Two-factor authentication is claimed as an offered feature.**
**CORRECTED IN PASS 3 — the original finding below was wrong. See Section 3, C1.**
~~`terms.md` §3: *"We offer two-factor authentication (2FA) and recommend you enable it."*
`privacy.md` §1 lists *"two-factor authentication details"* among data collected.
**Reality:** grep for `2FA|two-factor|factor` across `src/` returns zero hits outside
these two documents. There is no enrolment UI, no MFA call, and no factor state read
anywhere. **Classification: False.** A user relying on this and not enabling a password
manager was told a control exists that does not.~~

**Corrected reality:** TOTP 2FA is really implemented against Supabase MFA.
`TwoFactorEnroll.tsx` calls `supabase.auth.mfa.enroll/challenge/verify`; settings.tsx:473
renders it; `TwoFactorChallenge.tsx` is rendered by `login.tsx` when
`getAuthenticatorAssuranceLevel()` reports `nextLevel === "aal2"`. Enrolment changes real
server-side state (a verified factor in Supabase Auth). `terms.md` §3 is
**True**; `privacy.md` §1 is **True**. The pass-2 grep missed it because the code says
`mfa`, not `2FA` or `two-factor`. The residual issue — AAL2 is a UI gate only, not an RLS
or Data API condition — is a **new Section 3 finding (E2)**, not a false claim.
**Revised counts for Section 2: True 23 · False 12** (other categories unchanged).


**L3. The cookie table lists five trackers, none of which are loaded.**
`cookies.md` §3 tabulates Supabase, **Stripe**, **Google Analytics 4**, **Amplitude**,
**Microsoft Clarity**, **AppsFlyer**, and *"Ad platforms (e.g., Meta, Google)"* under
*"COOKIES AND TOOLS WE USE"* (present tense).
**Reality:** only Supabase is real. `src/lib/analytics.ts` is a facade whose
`dispatchToAnalyticsVendors` / `dispatchToMarketingVendors` bodies contain no vendor
calls (Section 1, M7); no Stripe SDK is loaded anywhere in `src/`. The section's own
hedge — *"The specific cookies and technologies we use may change over time"* — softens
future drift, not a present-tense list of tools that were never wired.
**Classification: False** (over-disclosure). Unusually, this errs *against* the company
rather than the user, but a cookie notice that names processors who receive nothing is
still inaccurate.

**L4. Privacy Policy claims collection of data that is never collected.**
`privacy.md` §1: *"Usage and analytics data: pages viewed, features used, events, session
recordings/heatmaps, approximate location derived from IP"*; *"Payment data: processed by
our payment providers; we receive limited billing details (e.g., plan, status, last four
digits)"*; *"push tokens"*.
**Reality:** no analytics vendor fires, so no pageviews, events, recordings or heatmaps
leave the browser; there is no payment provider, so no billing details are received (the
"last four digits" surface is `billing-mock.ts`, dead code per Section 1); there is no
mobile app and no push registration. **Classification: False** (over-disclosure, same
direction as L3).

**L5. Billing terms describe a purchase and renewal flow that does not exist.**
`billing.md` §2: *"Your paid subscription will begin automatically at the end of the trial
and you will be charged the disclosed amount unless you cancel before the trial ends."*
§3: *"Paid subscriptions **automatically renew** … By subscribing, you authorize us (and
our payment processors) to charge your payment method."* §8: *"In-app purchases are
processed by Apple App Store or Google Play and may be managed through RevenueCat."*
§4: *"we will provide renewal reminders."*
**Reality:** there is no checkout, no trial timer, no renewal, no charge, no RevenueCat,
and no app-store build. `upgradeToPro` in `src/lib/subscription.ts` is a direct
`profiles.plan` write, and the database trigger `enforce_plan_immutable` now rejects it
from the client anyway. **Classification: False** — though in the harmless direction: it
describes a future billing system as present. No user can be charged, so no user can be
mischarged. It becomes dangerous the moment billing lands and the copy is assumed
already-accurate.

**L6. Cancellation medium and step count.** `billing.md` §5: *"Cancellation is available
through the same medium you used to subscribe and takes no more than two (2) steps: for
web subscriptions, in your account under Manage Subscription → Cancel."*
**Reality:** `CancelSubscriptionDialog.tsx` is genuinely two steps (`decide` → `done`),
with no dark patterns and no call/chat requirement — the fix from earlier this week holds.
But it cancels a `localStorage` record (`subscription-mock.ts`), and nobody subscribed in
the first place. **Classification: True-but-fragile** — compliant as a flow, vacuous as an
outcome. Re-verify the step count when real billing replaces `scheduleCancel`.

**L7. Pause clause survives after the feature was removed.** `billing.md` §6 PAUSE:
*"Where offered, you may pause your subscription instead of cancelling."* `terms.md` §4
also lists *"pause"* among the terms described in the billing document.
**Reality:** pause was deliberately removed from the app this week. §6's *"Where offered"*
conditional makes it survive as written; the `terms.md` §4 enumeration does not hedge.
**Classification: True-but-fragile** (billing.md §6) / **False** (terms.md §4's reference
to pause terms that no longer exist).

**L8. GDPR/opt-out mechanics.** `privacy.md` §9: *"We honor recognized opt-out preference
signals (e.g., Global Privacy Control) where required"*; `cookies.md` §5: *"You can change
your consent choices at any time via the cookie settings link in the footer."*
**Reality:** both true. `src/lib/consent.tsx` reads `navigator.globalPrivacyControl`; the
footer link and `PreferencesModal` work; nothing non-essential fires pre-consent because
nothing fires at all. **Classification: True.** See `docs/CONSENT_POSTURE.md` for the
separate Delaware-law / Dublin-controller mismatch (`terms.md` §15), which is a posture
question for counsel, not a code-vs-claim finding.

**L9. Disclaimer is accurate and is the document doing the most work.**
`disclaimer.md` §1: *"All valuations, price estimates, portfolio values, ROI figures,
forecasts, signals … are **estimates, not guaranteed prices, appraisals, or offers**"*;
§4: *"Estimates are derived from your inputs and from third-party and public sources."*
**Reality:** §1 is true and broad enough to cover the demo figures. §4 is **False** in
one respect: portfolio market values are not derived from third-party sources but from a
seeded random walk over the user's own purchase price (Section 1, M1). A disclaimer
saying "these may be inaccurate" does not cover "these are synthetic."
**Classification: §1 True; §4 False.**

## 2.2 Severity 2 — paid-plan promises

**P1. Every Pro benefit is unpurchasable.** `PLAN_DEFS` advertises Pro Monthly at
*"$24.99"* and Pro Annual at *"$173.88"* with *"≈ $14.49 / month · save 42%"*, and
`Pricing.tsx` renders *"Go Pro"* / *"Go annual"* CTAs.
**Reality:** the plan buttons in `settings.tsx` are `disabled` and carry honest sub-copy —
*"Not available yet — plan changes need a billing provider, which isn't connected"* — and
`enforce_plan_immutable` blocks the write server-side. That is disclosed **in the app**.
The **landing page is not**: `Go Pro` links to `/quiz?plan=pro`, and grepping `src/` for
any reader of a `plan` search param returns nothing — the intent is silently dropped and
the visitor lands in the ordinary quiz. **Classification: False** (the landing CTA asserts
a purchase path that does not exist). Arithmetic checks out: 173.88/12 = 14.49; against
24.99/mo that is 42% off.

**P2. "Unlimited portfolio and brand watchlist"** (Pro Monthly benefit).
**Reality:** true — `enforce_portfolio_free_cap` and `enforce_watchlist_free_active_cap`
both early-return for non-free plans, so Pro genuinely has no cap. The counterpart free
claims — Features.tsx *"Up to 3 portfolio items and 10 brand watchlist items — free,
forever"*, and `PLAN_DEFS` free benefits *"Up to 3 portfolio items"* / *"Up to 10 brand
watchlist items"* — are enforced in the database, not just the UI. **Classification: True**
(the free-tier caps fix holds). *"forever"* is **Unverifiable**.

**P3. "All price alerts — price rises, drops, and new collections"** (Pro Monthly).
**Reality:** the alert *types* exist and render, and the free tier honestly labels its
own as *"Sample price alerts"*. But `select count(*) filter (where is_sample) from signals`
returns **424 of 424** — Pro's "all price alerts" is the identical sample set, with the
sample label dropped. **Classification: True of the code, false of the data**, and the
disclosure asymmetry (free says "sample", Pro does not) is the actively misleading part.

**P4. "Advanced notifications and quiet hours"** (Pro Monthly).
**Reality:** implemented and Pro-gated — `AlertDeliveryCard.tsx` gates on
`plan === "pro"` and `src/lib/alert-delivery.ts` evaluates the window. The quiet-hours
fix holds. What it gates is `notifications-mock.ts`, which writes a localStorage log and
`console.info`s. **Classification: True of the code, false of the data.**

**P5. "Portfolio dashboard"** (Pro) — **True** as a screen; the numbers on it are M1/M2
from Section 1. **"Unlimited price alerts and dashboard"** (Pro Annual) — same.
**"Priority support"** — **Unverifiable** (no ticketing system in the repo; an
out-of-band process may exist). **"Future automated value updates"** — explicitly
forward-looking, **True** as a statement of intent.

**P6. Pricing footnote.** `Pricing.tsx`: *"Free plan forever · Cancel in two steps ·
Reminder before billing"*.
- *"Cancel in two steps"* — **True-but-fragile** (see L6).
- *"Reminder before billing"* — **False.** No email is sent by any path in this project;
  `sendMockEmail` logs to localStorage and toasts. There is no scheduler, no provider, and
  no billing date to remind against.

## 2.3 Severity 3 — in-app copy asserting an outcome

**A1. "Email sent" toasts for emails that never leave the browser.**
`notifications-mock.ts:153`: `toast.success(\`Email sent · ${payload.template}\`, {
description: payload.to })`. Fired on cancellation and on account-deletion scheduling.
**Classification: False**, and the clearest case in the app of a user forming a specific
false belief — the toast names the template and the recipient address.

**A2. Mute contract docstring.** `src/lib/muted-sources.ts`: *"Muting a source hides its
alerts everywhere without touching the brand subscription itself."*
**Reality:** now **True.** The dashboard gap was closed by folding the filter into the
`useSignals` hook above the counting, so `/app` and `/app/signals` agree. The second half
of the same docstring — *"Frontend-only mock persisted in localStorage"* — is honest and
should be read alongside it: "everywhere" means every screen in this browser, not every
device. **Classification: True-but-fragile** (device-local; no server-side mute).
The accompanying toast, *"You'll still get alerts on this brand from other sources"*
(`SignalCard.tsx:36`), is **True of the code, false of the data** — no alerts are sent
from any source.

**A3. Downgrade toast.** `settings.tsx:126`: *"Nothing was deleted. Extra brand watchlist
items are paused and over-cap portfolio items are read-only."*
**Reality:** **True**, and precisely worded — `splitPortfolioByPlan` marks over-cap rows
read-only rather than deleting, `downgradeToFree` pauses rather than removes, and
`PortfolioCard` renders the paused state with Edit disabled. This is the model the rest of
the copy should follow.

**A4. Account-deletion dialog's retention carve-out.** *"We keep a minimal record that the
request was made and honoured — your user ID and the dates, with no personal details."*
**Reality:** **True** of the schema — `account_deletion_requests` keeps `user_id` and
timestamps, and `run-account-deletions.ts` nulls `portfolio_removals.note`. Note the
tension with L1: the record of the request is real; the honouring is dry-run.

**A5. Photo deletion.** No user-facing string promises it explicitly, but the deletion
dialog's *"everything … is permanently removed"* covers it.
**Reality:** the fix holds — `src/lib/portfolio.ts` calls
`supabase.storage.from(PORTFOLIO_BUCKET).remove(...)` on single and bulk removal, and the
purge step in the deletion job blocks the rest of the run if storage fails.
**Classification: True** at the item level; gated by L1 at the account level.

**A6. Watchlist target-price copy.** `watchlist.tsx` toast *"Target price saved"* — **True**
(it is persisted). The capability copy around it is covered by F3 below.

## 2.4 Comparison table — every PriceYou tick tested

`src/components/landing/Comparison.tsx`. Each PriceYou cell renders a filled green check,
the strongest affirmative in the grid.

| Row (verbatim) | PriceYou tick | Verdict |
| --- | --- | --- |
| "Private collection portfolio" | yes | **True** — RLS scopes every row to `auth.uid()`; bucket is private and signed-URL only |
| "Total portfolio value" | yes | **True of the code, false of the data** — the total is computed, but from `demo-market-prices.ts` |
| "Retail price-rise alerts" | yes | **True of the code, false of the data** — type exists; all 424 rows `is_sample` |
| "Drop and discount alerts" | yes | **True of the code, false of the data** — same |
| "Brand watchlist with target prices" | yes | **True-but-fragile** — targets are stored and rendered, but nothing evaluates them against a price, so the column tick is about storage only |
| "Multi-category tracking" | yes | **True** — `category_kind` covers watches, jewelry, bags, fashion, and all four are live |
| "No pressure to sell" | yes | **True** — no marketplace, no listing surface, no outbound sell prompt anywhere |

Four of seven ticks are honest. Three describe alerting capability that exists only over
sample rows. The grid's competitive framing makes this worse than the same claim in prose:
a check mark opposite a competitor's dash reads as a verified capability difference.

## 2.5 FAQ — every answer tested

`src/components/landing/FAQ.tsx`.

| Question | Answer verdict |
| --- | --- |
| "Do I need a huge collection, or only ultra-luxury brands?" — *"No. PriceYou works whether you own a few favorite pieces or a large collection…"* | **True** — 91 brands across all three segments; no minimum |
| "Is PriceYou a marketplace?" — *"No. PriceYou is your private space…"* | **True** |
| "How are item values calculated?" — *"On the current version you enter values manually or pick from a market reference. Automatic price updates come later. All values are estimates."* | **False in part.** Manual entry is true; *"market reference"* is `BASE_BRAND_VALUES`, a hardcoded literal table (Section 1). Critically, the answer omits that the **current value** shown on the portfolio and dashboard is neither manual nor a reference — it is a seeded random walk. A user reading this believes their displayed value came from one of the two named sources. This is the FAQ's worst answer |
| "Is this investment advice?" — *"No. Values and forecasts are estimates, not investment advice."* | **True** and consistent with `disclaimer.md` |
| "Which categories are supported?" — *"Watches and jewelry at launch, bags next. Fashion, art and interior objects come in a later phase."* | **True-but-fragile** — roadmap language, but it *understates*: bags and fashion are both already live in `category_kind`, while `Categories.tsx` labels bags *"At launch"* and fashion *"Phase 2"*. The two sections disagree with each other |
| "Can I track items I want to buy?" — *"Yes. Add targets to your brand watchlist with the price you'd buy at, and **get reminded when the market reaches it**."* | **False.** Targets persist; nothing compares them to a price and nothing sends a reminder. There is no price feed, no evaluator, and no delivery channel. This is a direct promise of a notification that cannot fire |
| "Is my collection public?" — *"No. Your portfolio is private by default. Nothing is shared unless you choose to."* | **True** — verified at the RLS and storage layer |

## 2.6 Remaining landing sections

**F1. Hero.** *"We keep an eye on your favorite brands, tell you when prices change, and
help you keep track of everything you own."* — a reasonable person reads all three clauses
as capabilities. Clause 3 is **True**. Clauses 1–2 are **True of the code, false of the
data**: nothing watches, and the "price change" rows are authored samples. The hero's
figures (`$128,450`, `+12.4%`, `Rolex Daytona +12%`, *"2 min ago"*, *"4 pieces on your
brand watchlist affected"*) are illustrative product-shot content, conventionally
understood as such — **not** classified as claims, but *"2 min ago"* asserts a data
freshness the product has never had. *"Built for collectors and resellers tracking $5K+
portfolios"* — **Unverifiable** positioning.

**F2. Features.** *"Set the price you'd buy at and get reminded the moment it's hit."* —
**False**, same as the FAQ target-price answer, and stronger ("the moment"). *"Alerts
tuned from step one"* — **True of the code, false of the data** (quiz picks do filter the
sample feed). *"Brand watchlist, portfolio, price alerts, and **billing** in the browser"*
— **False** as to billing; there is no billing surface. *"No marketplace, no pressure to
sell"* — **True**.

**F3. HowItWorks.** *"Retail price-rise alerts land first."* — **True of the code, false
of the data**; "first" is also a comparative claim against unnamed competitors,
**Unverifiable**. *"Your private dashboard shows what the collection is worth."* —
**False of the data**: it shows a random walk anchored on purchase price, and the word
"worth" is exactly the belief Section 1 flags as the most damaging.

**F4. ProblemSection.** *"You hear it on forums 24–48h later"*, *"Drops, discounts, and
resale gaps disappear within hours"* — market assertions about the world, not about the
product. **Unverifiable**, and acceptable as framing.

**F5. Audience.** *"Retail price-rise alerts, first"*, *"Drop and discount price alerts by
brand"* — **True of the code, false of the data**. *"Total portfolio value and history"* —
**False of the data** (history is `demo-price-history.ts`). *"Which models hold their
value"* — **False**: no such analysis exists anywhere in the app.

**F6. Categories.** Status pills *"At launch"* / *"Phase 2"* / *"Coming later"* are
roadmap labels and are honestly hedged — **True**, except for the internal disagreement
with the FAQ noted in 2.5. Brand lists match the `brands` table.

**F7. BrandMarquee.** Brand names only, no claim. The `terms.md` §7 disclaimer —
*"PriceYou is not affiliated with or endorsed by them"* — covers the logo wall.
**True**.

**F8. FinalCTA.** *"we'll let you know when it's the right time to buy"* — **False of the
data** and the most forward-leaning promise on the page, since "let you know" implies
delivery.

## 2.7 Regression check on this week's fixes

All six hold. Recorded briefly so a future pass can detect drift:

| Fix | Status |
| --- | --- |
| Two-step cancellation | **Holds** — `decide` → `done`, no dark patterns (see L6 for the mock caveat) |
| Quiet hours exist and are Pro-gated | **Holds** — `AlertDeliveryCard` + `alert-delivery.ts` |
| Photo deletion removes storage objects | **Holds** — single, bulk, and account-purge paths |
| Account deletion has a server-side path | **Holds as code** — but see **L1**: every run so far was `dry_run` |
| Free-tier caps enforced server-side | **Holds** — both triggers verified |
| Plan changes locked | **Holds** — `enforce_plan_immutable` + disabled buttons with honest sub-copy |

## 2.8 The single worst claim

**The FAQ's "How are item values calculated?" answer**, reinforced by HowItWorks' *"shows
what the collection is worth"* and Audience's *"Total portfolio value and history"*.

It is the worst not because it is the most false — L1 and L2 are flatly false, and L2 is
a security control that does not exist — but because it is the only claim that is
*specifically engineered to answer the exact question a sceptical user asks*, and it
answers it with two real-sounding mechanisms (manual entry, market reference) while
omitting the third one that actually produces the number on screen. A user who reads it
comes away with a **precise and wrong** model of where their portfolio value comes from,
and that number is denominated in their own money. Every other false claim leaves the user
merely uninformed; this one leaves them confidently misinformed.

Runner-up: **L2 (2FA)** — a claimed security control that does not exist is the finding
with the shortest path to real user harm, and the cheapest to fix by deleting one sentence.

---

# Section 3 — Enforcement

**Run:** 19 Aug 2026. **Method:** two throwaway accounts were created via the Auth Admin
API and driven through the publishable key exactly as a browser console would, so every
line marked *confirmed by testing* is the result of an attempted write, not a read of a
policy. Grants, policies, and function ACLs were read from `pg_class.relacl`,
`pg_policy`, and `pg_proc.proacl`. Server functions were invoked from a real anonymous
browser page. No application code, schema, or policy was changed.

Evidence tiers used below: **[T]** confirmed by testing · **[R]** confirmed by reading ·
**[U]** unverified.

## 3.0 Lead findings — worst first

**E1. `recognizePortfolioPhoto` is an unauthenticated, unmetered proxy to a billable AI
key. [T]** `src/lib/portfolio-recognize.functions.ts` has no `.middleware()`, no session
check, no rate limit, and no image-size bound beyond `min(20)` characters. Its RPC id is
a plain base64 of the file path and export name, printed verbatim into the client bundle,
so it is trivially discoverable. Called from a fresh anonymous browser page with no
session, it returned `{ ok: true }` — meaning the request reached
`ai.gateway.lovable.dev` and was billed to `LOVABLE_API_KEY`. Anyone on the internet can
loop this endpoint and spend the project's AI credits, with arbitrary attacker-chosen
images as input. **This is the pass-3 equivalent of the plan bypass, and it is worse:
the plan bypass required an account and was blocked at the database; this one requires
nothing and is blocked nowhere.** Contrast `submitContactMessage` and
`subscribeNewsletter`, which are also unauthenticated but carry a honeypot and a per-IP
rate limit — the pattern exists in the codebase and was simply not applied here.

> **E1 — FIXED 2026-08-19.** The finding above is left intact as the record of what
> was found; this note records what was done about it.
>
> **Changed** (`src/lib/portfolio-recognize.functions.ts`, application code only — no
> schema, policy, or component change):
> 1. `.middleware([requireSupabaseAuth])` added to `recognizePortfolioPhoto`, matching
>    the five other authenticated server functions. Anonymous callers are now rejected
>    by the middleware before the validator or the handler runs.
> 2. Payload bounded server-side: `.max(12_000_000)` characters on `image_data_url`
>    (the modal's 8 MB client limit base64-encodes to ~11 MB), plus a strict
>    `^data:image/<type>;base64,<b64>$` pattern replacing the old
>    `startsWith("data:image/")` check. Both run in `inputValidator`, which executes
>    before the handler that owns the only `fetch` to the gateway.
> 3. A comment recording the generalisable lesson: TanStack Start server-function ids
>    are derived from the file path and export name and ship in the client bundle, so
>    they are effectively public. Every server function must authenticate on its own;
>    obscurity of the id is not a control.
>
> **Re-verified by re-running the original exploit [T]**, from a headless browser with
> an empty `localStorage` and no cookies, dynamically importing the module and calling
> the function exactly as in the original proof:
> - Session-less call → `Unauthorized: No authorization header provided` — the same
>   rejection the other authenticated functions give. Previously `{ ok: true }`.
> - Oversized payload (16,000,022 chars) with a valid session → rejected with Zod
>   `too_big` / `"Image is too large"`. A `data:text/html;base64,...` payload → rejected
>   with `"Must be a base64 image data URL"`. Neither reached the gateway: the dev
>   server log recorded zero `[recognizePortfolioPhoto]` entries and no gateway
>   activity across both attempts, consistent with validation preceding the handler.
> - Normal call, valid session, small valid PNG → `{ ok: true }`. The
>   add-portfolio-photo flow is not regressed.
>
> **Test data:** one throwaway account (`e1-verify-…@example.com`) created via public
> signup for the authenticated cases, deleted afterwards; `auth.users`,
> `public.profiles`, and `public.portfolio_items` all verified at 0 rows for that id.
>
> **Residual — open. [R]** An *authenticated* user can still call this in a loop; the
> spend is now attributable and requires an account, but it is not capped. Deliberately
> not fixed in this pass: the `contact`/`newsletter` limiter counts rows in the
> destination table the submission creates, and recognition has no destination table,
> so a real limiter needs new storage. It would need a `public.ai_usage_events` table
> (`user_id`, `created_at`, `kind`), written by the handler and counted over a rolling
> window before the gateway call, with RLS confining each user to their own rows and a
> retention/pruning job. Until that exists, the exposure is bounded by account creation,
> not by usage.


**E2. AAL2 is a UI gate, not an access-control boundary. [T]** 2FA is real (see C1), but
enforcement lives in `src/routes/_authenticated/route.tsx:61` and `login.tsx:64`, both
client-side. A signed-in session that has not completed the TOTP challenge still holds a
valid `aal1` JWT: the test session's decoded token showed `aal: aal1`, and every Data API
call it made — reading its own profile, portfolio, watchlist, inserting rows, hitting
every trigger — succeeded. No RLS policy anywhere references
`request.jwt.claims->>'aal'`. A user who enrols 2FA has protected the app's screens, not
their data: an attacker with the password alone can skip the React app entirely and read
and write everything through the Data API. The settings copy — *"You'll be asked for a
6-digit code the next time you sign in"* — is true of the UI and overstates the
protection.

**E3. Paused (over-cap) portfolio items are read-only in the browser only. [T]** Simulated
a genuine downgrade: promoted the test user to Pro, added 5 items, returned them to Free.
`splitPortfolioByPlan` marks items 4 and 5 paused, and `PortfolioCard` disables Edit. Both
paused rows were then updated straight through the Data API — `purchase_price` and `brand`
both changed, no error. There is no trigger and no policy behind the paused state; the
`Lock` badge is presentation. The same applies to watchlist rows paused by
`downgradeToFree`, which is a client-side `is_active: false` write: after the simulated
downgrade the account still held **13 active** watchlist rows against a cap of 10, and
nothing server-side objected. The caps are enforced **at the moment of insert or
activation** — they are not invariants.

**E4. Admin-only reads are broken for everyone, including admins. [T]** `public.has_role`
has `EXECUTE` for `postgres` and `service_role` only — `authenticated` was never granted
it. Every policy that calls `has_role(auth.uid(), 'admin')` therefore fails with
`permission denied for function has_role` before it can evaluate. Confirmed against
`contact_submissions`, `newsletter_subscribers`, `account_deletion_runs`,
`account_deletion_dispatches`, and the admin policies on `posts`. This **fails closed**,
so it is not a data exposure — but it means the deletion-run monitoring surface and any
admin blog editing are unreachable from the app by design accident, and Section 2's
observability story rests on queries only the service role can run.

## 3.1 Every asserted limit and gate, with its enforcement point

| Gate the product asserts | Enforced by | Holds? |
| --- | --- | --- |
| Free: max 3 portfolio items | DB trigger `enforce_portfolio_free_cap` | **Yes [T]** — 4th insert rejected `P0001`; a batched 3-row insert was also rejected, so the `plpgsql` note in the function is doing real work |
| Free: max 10 active watchlist items | DB trigger `enforce_watchlist_free_active_cap` | **Yes at insert [T]** — 11th rejected. **No retroactively [T]** — pre-existing active rows survive a downgrade |
| Plan cannot be self-changed | DB trigger `enforce_plan_immutable` | **Yes [T]** — `plan` and `billing_period` both rejected `42501` |
| Over-cap portfolio items are read-only | Browser (`PortfolioCard`, `splitPortfolioByPlan`) | **No [T]** — see E3 |
| Watchlist rows paused on downgrade | Browser (`downgradeToFree`) | **No [T]** — see E3 |
| Pro-only: quiet hours / advanced notifications | Browser (`AlertDeliveryCard` + `localStorage`) | **No** [R] — nothing server-side; the state it gates never leaves the browser |
| Pro-only: billing card | Browser (`BillingCard`, `billing-mock`) | **No** [R] — cosmetic; there is no billing data to leak |
| Muted alert sources | Browser (`localStorage`) | **No** [R] — device-local by design, as its own docstring says |
| Subscription / cancellation state | Browser (`localStorage`) | **No** [R] — mock, per Section 1 |
| Plan-change buttons disabled | Browser (`settings.tsx`) | Cosmetic, but backed by the `plan` trigger [T] |
| 2FA required at sign-in | Browser (`login.tsx`, `_authenticated/route.tsx`) | **UI only [T]** — see E2 |
| Portfolio / watchlist / profile ownership | RLS, `auth.uid()` | **Yes [T]** — every cross-user read returned 0 rows and every cross-user write was rejected |
| Photo ownership | Storage RLS on `storage.objects`, folder = uid | **Yes [T]** — cross-user download, signed-URL mint, and upload all rejected; cross-user `list` returns `[]` |
| Role escalation blocked | RLS on `user_roles` (no INSERT policy) | **Yes [T]** — self-grant of `admin` rejected |

**Count: 8 gates database-backed, 3 server-function-backed (auth middleware, cron
secret, honeypot + per-IP rate limit), 9 browser-only.** Of the nine browser-only gates,
six are cosmetic wrappers around mock data and cost nothing; **three are real** — paused
portfolio items, downgrade pausing, and the AAL2 gate.

## 3.2 RLS coverage, table by table

RLS is **enabled on all 14 tables** in `public` [R]. Where the app performs a command
that has no matching policy, that is noted.

| Table | anon | authenticated | Notes |
| --- | --- | --- | --- |
| `profiles` | none | SELECT/UPDATE `auth.uid() = id` | No INSERT policy — rows come from the `on_auth_user_created` trigger [R]. `email`, `quiz_completed`, `onboarding_completed` are all client-writable [T]; see 3.5 |
| `portfolio_items` | none | all four, `auth.uid() = user_id` | Clean [T] |
| `watchlist` | none | all four, `auth.uid() = user_id` | Clean [T] |
| `user_roles` | none | SELECT own only | No INSERT/UPDATE/DELETE policy — escalation impossible from the client [T] |
| `signals` | none | SELECT `true` | Authenticated users read *all* signals, not only their brands — filtering is client-side. Harmless today (sample rows), a leak surface once real |
| `brands`, `models` | SELECT `true` | SELECT `true` | Read-only catalog; writes rejected [T] |
| `posts` | SELECT `published = true` | admin CRUD + public read | Anon sees only published [T]. Admin policies unreachable — E4 |
| `newsletter_subscribers` | explicit `false` on I/U/D | admin SELECT | Writes go through the admin client in a server fn. Read blocked by E4 |
| `contact_submissions` | none | admin SELECT | Same shape; read blocked by E4 |
| `portfolio_removals` | none | INSERT only, plus RESTRICTIVE `false` on S/U/D | **Correctly write-only [T].** One sharp edge: `.insert().select()` fails with `permission denied for table` because `authenticated` holds no SELECT grant. `src/lib/portfolio.ts:208` inserts without `.select()`, so the app is fine — but any future caller that adds `.select()` breaks [T] |
| `account_deletion_requests` | none | SELECT/INSERT/UPDATE own | Cross-user insert rejected; cross-user update matches 0 rows [T] |
| `account_deletion_runs`, `account_deletion_dispatches` | none | admin SELECT | Blocked by E4 |

**Excess grants worth noting [R]:** `anon` holds full `arwdDxtm` table grants on
`profiles`, `portfolio_items`, `watchlist`, `user_roles`, `signals`, and the three
`account_deletion_*` tables. RLS is the only thing standing between an anonymous caller
and those tables — every anon probe returned 0 rows or a policy violation [T], so nothing
leaks today, but the grants are wider than the policies and remove the second layer.
`anon` also holds `UPDATE` on `posts` with no anon UPDATE policy.

## 3.3 Server functions and API routes

| Endpoint | Auth | Unauthenticated call |
| --- | --- | --- |
| `saveQuizAnswersV3` | `requireSupabaseAuth` | `Unauthorized: No authorization header provided` [T] |
| `getMyDeletionRequest` / `requestAccountDeletion` / `cancelAccountDeletion` | `requireSupabaseAuth`, all scoped to `context.userId` | Same 401 [T]. `userId` comes from the validated token, never from input [R] |
| `purgeMyPortfolioPhotos` | `requireSupabaseAuth`; purges `context.userId` only | 401 [T] |
| `recognizePortfolioPhoto` | **none** | Succeeds and bills the AI key — **E1** [T] |
| `subscribeNewsletter` | none by design | Succeeds; honeypot + 5/min/IP; writes via admin client [T] |
| `submitContactMessage` | none by design | Honeypot + 3/min/IP; reCAPTCHA branch is dormant because `RECAPTCHA_SECRET_KEY` is unset [T] |
| `listPublishedPosts` / `getPublishedPostBySlug` | none by design | Publishable-key client, `published = true` filter [R] |
| `POST /api/public/run-account-deletions` | `x-account-deletion-secret`, length-checked then constant-time compared, fails closed on empty secret | `401 {"error":"unauthorised"}` with no header and with a wrong header [T]. `GET` returns the SPA shell, not the job [T] |

The per-IP limits are best-effort: they trust `cf-connecting-ip` / `x-forwarded-for` and
count rows in the destination table, so they slow a naive bot and do not stop a
distributed one [R].

## 3.4 Secrets and keys

`.env` contains only `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
and their `VITE_` twins — all public by design [T]. The only `import.meta.env` reads in
`src/` are the two Supabase publishable values and `VITE_RECAPTCHA_SITE_KEY` (a site key,
public by definition) [T]. `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, and
`ACCOUNT_DELETION_CRON_SECRET` exist only in the server runtime and are read inside
handlers [R]. `supabaseAdmin` is imported via `await import(...)` inside handler bodies
everywhere it appears, so it stays out of client chunks [R]. **No sensitive value is
reachable from client code.** The exposure in E1 is not a leaked key — it is an unguarded
endpoint that spends one.

## 3.5 What a determined user can do from the console

Everything below was attempted with a real `authenticated` session.

**Cannot [T]:** read any other user's profile, portfolio, watchlist, deletion request, or
photos; write rows owned by another user; grant themselves `admin`; change `plan` or
`billing_period`; insert signals, brands, or posts; read `portfolio_removals`,
`contact_submissions`, `newsletter_subscribers`, or the deletion-run tables; mint a
signed URL for someone else's photo.

**Can [T]:**
1. Edit portfolio items the UI has locked as paused (E3).
2. Keep more than 10 active watchlist rows after a downgrade (E3).
3. Operate the entire Data API at `aal1` with 2FA enrolled (E2).
4. Overwrite `profiles.email` with an arbitrary string. The value only ever labels the UI
   and the deletion job keys off the *auth* email, so nothing breaks — but the column can
   silently disagree with `auth.users`.
5. Flip `quiz_completed` / `onboarding_completed`, and set `signal_every_move` and the
   `alert_*` fields the Add-item modal no longer exposes. All inert today; all become
   meaningful the moment alerts are real.
6. Read the **entire** `signals` table, not just the rows for their own brands.
7. Upload arbitrary file types and sizes into their own storage folder — the
   `portfolio-photos` bucket has no `file_size_limit` and no `allowed_mime_types`. A 3 MB
   binary and an HTML file both uploaded successfully. Private bucket, own folder only, so
   this is a storage-cost and quota concern rather than a serving-XSS one.

**Unverified [U]:** whether the published deployment behaves identically to the local dev
server for the server-function endpoints (tested against `localhost:8080` only); whether
any real admin account exists to be affected by E4; whether the AI gateway applies its
own upstream rate limiting that would blunt E1.

## 3.6 Correction to Section 2

**C1. Section 2's L2 (2FA) was wrong, and is now corrected in place.** TOTP two-factor is
genuinely implemented against Supabase Auth MFA: `TwoFactorEnroll.tsx` calls
`mfa.enroll` → `mfa.challenge` → `mfa.verify` and cleans up stale unverified factors
first; `settings.tsx` renders it; `login.tsx` renders `TwoFactorChallenge` whenever
`getAuthenticatorAssuranceLevel()` returns `nextLevel === "aal2"`, and
`_authenticated/route.tsx` re-checks the same condition on entry. Enrolment creates real
server-side state, and a second factor **is** required to reach the app's screens. The
pass-2 grep searched `2FA|two-factor|factor` and the implementation says `mfa`. `terms.md`
§3 and `privacy.md` §1 are **True**, not False. Revised Section 2 counts: **True 23,
False 12**. The genuine weakness is E2 above, which is a Section 3 enforcement finding.

## 3.7 Test data created and removed

Created: two auth users (`audit-pass3-a@example.com`, `audit-pass3-b@example.com`), 5
portfolio items, 13 watchlist rows, 1 `portfolio_removals` row, 1
`newsletter_subscribers` row (`audit-pass3-anon@example.com`, from the anonymous
server-function test), and 4 storage objects across both users' folders. Both users were
promoted to Pro and returned to Free during the downgrade simulation.

Removed: all storage objects, the removal row, the newsletter row, and both auth users
(cascading profiles, portfolio, watchlist, roles). Post-cleanup verification returned 0
rows for both user IDs across `profiles`, `portfolio_items`, `watchlist`,
`portfolio_removals`, and `account_deletion_requests`, and 0 storage objects in both
folders. No production row was read, modified, or deleted.
