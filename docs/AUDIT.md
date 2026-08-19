# PriceYou — Product Audit

> **Read this first.** Fix today: **Gate A** (E1 — already done; nothing else qualifies).
> Blocks launch: **Gate B**. The incoming team's job: **Gate C**. Later hardening:
> **Gate D**. Section 5 routes every finding into one of those four gates — start there,
> then read the detail in Sections 1–4.

**Run:** 19 Aug 2026 (UTC). Four passes: real vs mock (1), claims vs reality (2),
enforcement (3), client-only state (4), plus a remediation routing layer (5).

## What this product currently is — read before judging any severity

PriceYou is a **pre-handoff MVP**, not a live business. Specifically:

- **Test users only.** The rows in `profiles`, `portfolio_items`, and `watchlist` are
  test accounts, not paying customers. No real customer is looking at the portfolio
  dashboard today.
- **The backend data is temporary.** It exists to exercise the screens and is expected to
  be replaced or discarded at handover.
- **Nothing has been sold.** There is no billing provider, no checkout, and no payment
  has ever been taken — so the paid-plan copy in Section 2 currently misleads nobody.
- **It will be handed to developers via the Git connection**, and the audit's main job is
  to tell that team what is real, what is scaffolding, and what must be true before a
  real user arrives.

**How to read severity throughout this document:** every finding is graded as *"this must
not be true when real users see it"*, **not** as *"this is harming someone right now."*
Where Sections 1–4 say a claim is false or a user is misled, read it as a statement about
the artefact, not an allegation about live conduct — the reader described is a
hypothetical future user, because there are no others yet. The facts in Sections 1–4 are
unchanged by this framing and none of them have been softened; only the clock has.

Sections 1–4 were written before this framing was added and read in places as though
auditing a running product. They are left intact deliberately — Section 5 is the routing
layer that applies the launch-gate reading.

Read-only passes throughout; the exceptions are recorded in 5.6.


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
| `recognizePortfolioPhoto` | ~~none~~ → `requireSupabaseAuth` (fixed 2026-08-19) | Was: succeeded and billed the AI key — **E1**. Now: `Unauthorized: No authorization header provided`, plus a 12M-char / `data:image/…;base64,` server-side payload bound. Still unmetered per authenticated user [T] |
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

---

# Section 4 — Client-only state

Pass 4 of 4. Report only; no code, schema, or policy was changed in this pass.

The spine of this section: **localStorage is not the failure.** A quiz draft belongs
in the browser and would be worse anywhere else. The failure is *state that something
else needs to read* living where only one browser can see it — "something else" being
another device, another tab, the next account to sign in on that machine, a regulator
asking for a consent record, or a server process deciding whether to send an email.
Every classification below turns on that question and nothing else.

## 4.0 Two cross-cutting defects, before the inventory

These affect several keys at once and are easier to state once than eleven times.

**C1 — Four settings keys are not keyed by user.** `luxtracker.consent.v1`,
`lux.notifications.prefs.v1`, `lux.alert.delivery.v1`, and `lux.mutedAlertSources.v1`
are flat global keys. `subMock:<userId>` and `pyou:onboarded:<userId>` are correctly
namespaced; those four are not. Sign out, sign in as someone else on the same browser,
and the second account silently inherits the first account's notification toggles,
quiet hours, muted sources, and cookie consent. Nothing clears them at sign-out. On a
shared or family machine this is one user's consent decision applying to another user's
session. [R — read from the key definitions; not exercised with two accounts this pass.]

**C2 — Only one key syncs across tabs.** `muted-sources.ts:68` is the sole module that
listens for the `storage` event. Every other module broadcasts a same-tab `CustomEvent`
(`subscription-mock:changed`, `notifications-mock-change`, `alert-delivery-change`),
which by definition does not cross tabs. So with settings open in two tabs, a change in
tab A is invisible to tab B, and whichever tab writes last wins on a whole-object
`{...get(), ...patch}` overwrite — tab B silently reverts tab A's change rather than
merging. [R]

## 4.1 Inventory

Twelve storage locations. For each: what it controls, and the four scenarios.

### 1. `luxtracker.consent.v1` — localStorage
Cookie/analytics consent record: `{ prefs: {necessary, functional, analytics, marketing},
timestamp, version }`. Read by `consent-storage.ts` (React-free, deliberately) and by
`analytics.ts` via `hasConsent()`, fresh on every call. Screens: `CookieBanner`,
`PreferencesModal`, and every analytics call site.
- **Switch device/browser:** banner reappears; prior decision is not carried. Analytics
  defaults to denied (fail-closed), so no tracking leaks — but the *record* of consent
  does not exist server-side at all.
- **Clear site data:** decision is gone; banner reappears; back to denied.
- **Private window:** banner every time.
- **Two tabs:** no `storage` listener; tab B keeps showing the pre-change state until
  reload. `hasConsent()` re-reads storage per call, so gating is correct even in the
  stale tab — only the UI disagrees.
- **Is the user told?** No. `cookies.md` and `privacy.md` describe consent as an account
  preference; nothing anywhere says "this decision applies to this browser only."

### 2. `lux.notifications.prefs.v1` — localStorage
Five channel toggles (`price_alerts`, `weekly_digest`, `plan_updates`, `product_news`,
`security_alerts`); `plan_updates` and `security_alerts` are flagged `required` and
`setPref` refuses to disable them. Screen: `NotificationPreferencesCard` in settings.
- **Switch device / clear data / private window:** silently resets to `DEFAULT_PREFS` —
  which re-enables `price_alerts` and `weekly_digest` and disables `product_news`. A
  user who opted *out* of the weekly digest is opted back *in* on their phone.
- **Two tabs:** C2 — last writer wins on the whole object.
- **Is the user told?** No. This card is presented as an account-level preference panel
  and is indistinguishable from one.

### 3. `lux.alert.delivery.v1` — localStorage
Quiet hours (enabled, from, to, days, on_end), plus `rhythm`, `min_move`,
`allow_price_rise`. `timezone` is deliberately *not* trusted from storage — it is
re-derived from the device on every read. Screen: `AlertDeliveryCard` (Pro).
- **Switch device:** quiet hours revert to off, and the timezone silently changes to the
  new device's. Set 22:00–08:00 in London, open in New York, and the window moves five
  hours.
- **Clear data / private window:** reverts to `DEFAULT_ALERT_DELIVERY` — quiet hours off.
- **Two tabs:** C2.
- **Is the user told?** Partially, and only about one axis: `AlertDeliveryCard.tsx:187`
  says "Quiet hours follow this device's clock." Nothing says the *settings themselves*
  are per-device. The file's own header comment is blunter than the UI: "this is
  cosmetic — client-side state cannot stop a server sending an email at 3am."

### 4. `lux.mutedAlertSources.v1` — localStorage
Array of muted source hostnames; `signals.ts` filters the feed through it. Screens:
`MutedAlertSourcesCard`, `SignalCard`, signals feed.
- **Switch device / clear data / private window:** mutes are lost; muted sources
  reappear in the feed with no explanation.
- **Two tabs:** the one key that *does* sync — it listens for `storage`.
- **Is the user told?** No.

### 5. `subMock:<userId>` — localStorage
Scheduled cancellation (`status`, `endsAt`), churn reason and free-text note,
`cancelledAt`, and accepted retention offer (`saveOfferAcceptedAt`,
`saveOfferDiscountPct`). Screens: `BillingCard`, `CancelSubscriptionDialog`,
settings.
- **Switch device:** the subscription reads as `active` with no scheduled cancellation.
  A user who cancelled on their laptop sees no cancellation on their phone.
- **Clear data:** the cancellation is erased. The accepted discount is erased with it.
- **Private window:** as above.
- **Two tabs:** same-tab event only; C2.
- **Is the user told?** No — and this is the one where the copy actively contradicts the
  storage. Section 2 already found `billing.md` describing renewals and charges that
  don't exist; this is the same gap in the state layer.

### 6. `lux.notifications.log.v1` — localStorage
Last 50 "sent" mock emails, for design review. Read only by the mock's own log display.

### 7. `pyou:onboarded:<userId>` — localStorage
Same-session guard against double-seeding the watchlist. The *authoritative* guard is
`profiles.onboarding_completed`, written server-side first (`use-seed-watchlist.ts:47`)
precisely so a local miss cannot cause a re-seed.

### 8. `lux_quiz_draft_v3` — localStorage
In-progress quiz answers (categories, brands, segments, role) before the account exists
or before the profile write lands. `_authenticated/app/route.tsx:35` persists the draft
into the profile on entry, so the local copy is a staging area, not the record.

### 9. `lux_quiz_draft` — localStorage
Legacy V1 equivalent of the above. Still written by `quiz.ts`; superseded by V3.

### 10. `dashboard.insightsTab` — sessionStorage
Which tab of `InsightsCard` is selected. Session-scoped by design.

### 11. `sidebar_state` — cookie
Sidebar collapsed/expanded, cookie rather than localStorage so SSR can render the
correct width without a flash.

### 12. `sb-<project>-auth-token` — localStorage
The Supabase session, written by the generated client. Not app state; listed for
completeness.

## 4.2 Classification

### Must be server-side — 5

| Key | Why it qualifies |
| --- | --- |
| `luxtracker.consent.v1` | Legal. GDPR/ePrivacy require being able to *demonstrate* consent was given — who, what, when, under which policy version. The record carries `timestamp` and `version` already, which is exactly the shape of an audit record, and then stores it where it cannot be produced on request and cannot survive a cleared cache. Compounded by C1: another user's consent can apply to this session. |
| `lux.notifications.prefs.v1` | A server process must read it. The moment any email is genuinely sent, the send path has to consult these toggles — a preference the sender cannot see is not a preference. `product_news` additionally carries marketing-consent weight. |
| `lux.alert.delivery.v1` | A server process must read it, and the file says so itself: client state cannot stop a 3am email. Quiet hours are only real when checked at send time. |
| `subMock:<userId>` | Contractual. A scheduled cancellation date and an accepted discount percentage are commitments between the user and the business; they cannot live somewhere the business cannot read and the user can delete. |
| `lux.mutedAlertSources.v1` | Conditionally — today it only filters a client-rendered feed, which is defensible. It moves into this bucket the moment alerts are actually delivered, because a muted source must be suppressed at send time, not after arrival. Listed here rather than below because the alert-sending work is already planned. |

### Should be server-side — 1

| Key | Why |
| --- | --- |
| `pyou:onboarded:<userId>` | Already effectively is — `profiles.onboarding_completed` is authoritative and is written first. The local key is a redundant fast path with no independent meaning. No action needed beyond knowing it isn't load-bearing. |

### Correctly local — 6

| Key | Why it is fine |
| --- | --- |
| `lux_quiz_draft_v3` | A draft, by definition pre-account. Server-side storage would require an identity the user doesn't have yet. It is promoted to the profile on entry, so the durable copy is server-side. This is the pattern the others should copy. |
| `lux_quiz_draft` | Same, legacy. The only note is that it is dead weight worth deleting. |
| `dashboard.insightsTab` | Ephemeral view state; `sessionStorage` is the right scope. |
| `sidebar_state` | UI chrome. A cookie so SSR avoids a layout flash — correct choice. |
| `lux.notifications.log.v1` | A mock display surface with no user-facing meaning. When real notification history lands it becomes a server concern, but the mock is not that. |
| `sb-<project>-auth-token` | Where a session belongs. |

## 4.3 What the server-side versions need

Brief, for the incoming developers.

- **Consent** — `public.consent_records` (`user_id`, `prefs jsonb`, `version text`,
  `granted_at timestamptz`, optionally `ip`/`user_agent`). Append-only: a new row per
  decision, never an update, because the point is the history. RLS: user reads and
  inserts their own; no anon. Grants to `authenticated` and `service_role`. Read by any
  future analytics or email process, and by whoever answers a data-subject request.
  Pre-login consent still needs the local record — write through to the table on sign-in.
- **Notification preferences + quiet hours** — one `public.notification_settings` row per
  user (`user_id` PK, five channel booleans, quiet-hours columns, `timezone text`,
  `rhythm`, `min_move`). Timezone becomes stored rather than device-derived, which is
  the point. RLS: owner-only read/write, `service_role` full. Read by the alert-send
  process at send time — that reader is the whole justification.
- **Muted sources** — `public.muted_alert_sources` (`user_id`, `hostname`, unique
  together). Owner-only RLS. Same reader as above.
- **Subscription lifecycle** — should not get a bespoke table; it is Stripe's job. Until
  Stripe lands, the honest interim is columns on `profiles`
  (`cancel_scheduled_at`, `cancel_reason`, `discount_pct`) so the state at least survives
  a cleared cache and is visible to support.

Every one of these needs the `GRANT` block alongside the policies — Section 3 found
`portfolio_removals` shipped with an INSERT policy and no SELECT grant, which is the
failure mode to avoid repeating.

## 4.4 Counts and the first move

**Must be server-side: 5 · Should: 1 · Correctly local: 6.** Plus two cross-cutting
defects (C1 unkeyed-by-user, C2 no cross-tab sync) that affect four of the five in the
first bucket.

**Move first: `luxtracker.consent.v1`.** Not because it is the most broken — the
consent gate itself fails closed and behaves correctly, which is better than most of
this list. It goes first because it is the only one whose absence cannot be fixed
retroactively. Notification preferences reset to a default and the user re-sets them;
a cancellation can be reconstructed from support tickets. But a consent record that was
never written server-side cannot be produced later — the evidence simply does not exist,
and the obligation is to have it at the moment consent was given. Add C1 to that and the
current state is worse than absent: one user's stored decision can be read as another
user's consent.

The argument against, which I'd want on the record: quiet hours look more urgent because
Section 2 sold them as a Pro feature and Section 3 confirmed the enforcement is
cosmetic. I'd still put consent first, on the grounds that no server currently sends any
email at all — so quiet hours are enforcing nothing against nothing, and the honest fix
there is the send path, not the storage. Consent is accruing an unfillable gap today.

---

# Section 5 — Remediation by launch gate

Routing layer, not a summary. Every finding from Sections 1–4 is referenced by its
existing id and appears in **exactly one** gate. Nothing is restated; if a line here is
not enough to act on, the id is the index back into the detail.

**A note on id collisions.** Section 3.6 uses **C1** for the "Section 2's L2 was wrong"
correction, and Section 4.0 uses **C1**/**C2** for the client-state defects. In this
section, **C1** and **C2** always mean the Section 4 defects; the 3.6 item is referred to
as **the 3.6 correction** and is not a finding requiring work.

Four unnumbered findings are routed by their location, because Sections 2–3 never gave
them ids: **[3.2-grants]** (excess `anon` table grants), **[3.2-signals]** (`signals`
readable in full by any authenticated user), **[3.2-removals]** (`portfolio_removals`
INSERT policy with no SELECT grant), **[3.3-iplimit]** (per-IP limiters trust
`cf-connecting-ip`), **[3.5-storage]** (no `file_size_limit` / `allowed_mime_types` on
`portfolio-photos`), **[3.5-profile]** (`profiles.email` and the inert `alert_*` /
`quiz_completed` columns are client-writable), and **[1.2-dead]** (dead `billing-mock`
code and the legacy `lux_quiz_draft` key).

---

## Gate A — true now, regardless of MVP status

Costs money or is exposed to the open internet today, where "pre-launch" is not a
defence.

| Id | Status |
| --- | --- |
| **E1** | **Done, 2026-08-19.** `requireSupabaseAuth` added, plus a 12M-char and `data:image/…;base64,` payload bound. Re-tested session-less (401), oversized (rejected pre-handler, no gateway call), and normal authenticated (succeeds). |

**E1 is the only member of this gate, and that is a finding rather than an omission.**
Everything else in the document requires an account, requires a real user to exist, or
requires money to be moving — and none of those are true yet. I considered and rejected
four candidates for this bucket:

- **[3.2-grants]** — wide `anon` grants, but every anon probe returned zero rows; RLS
  holds. Exposed but not reachable → Gate B.
- **E4** — broken, but it fails *closed*. No exposure.
- **M1/M2** — the misleading dashboard is only shown to test accounts. The harm requires
  a real user → Gate B.
- **[3.5-storage]** — unbounded uploads cost storage, but only from an authenticated
  account in its own folder, and there are no real accounts → Gate D.

**Count: 1 (1 done, 0 open).**

---

## Gate B — blocks launch

Must be true before a real user signs up or a real payment is taken. Nothing here is
optional; all of it is currently false.

**Undisclosed demo data shown as the user's own money (5):**
**M1**, **M2**, **M3**, **M4**, **M5**. Either the data becomes real (Gate C) or the
screens disclose it. Shipping M1/M2 undisclosed to a paying user is the document's worst
outcome; **2.8** names the FAQ answer that makes it worse by explaining the number wrongly.

**False statements in legal copy (7):**
**L1**, **L3**, **L4**, **L5**, **L6**, **L7**, **L8**. These are contract text; they are
false the instant a user accepts them. Most are deletions rather than features.
**L2** is *not* here — the 3.6 correction found it true. **L9** needs no work (see 5.5).

**Paid-plan promises that cannot be met (5):**
**P1**, **P2**, **P3**, **P4**, **P6**. Gate on "before a payment is taken" rather than
"before launch" if the plan is to launch free-only — but the copy must change either way.
**P5** is true as a screen and depends on M1/M2.

**In-app copy asserting a false outcome (4):**
**A1**, **A2**, **A3**, **A5**. A3 and A5 are currently *true* and are listed here only as
regression guards — they must still be true at launch. A1 is a straight false toast.
**A4**, **A6** need no work.

**Landing-page claims (6):**
**F1**, **F2**, **F3**, **F5**, **F8**, plus the three failing Comparison ticks and the
two false FAQ answers in **2.4**/**2.5**. **F4**, **F6**, **F7** are fine.

**Enforcement gaps that protect revenue (2):**
**E3** (paused portfolio items and downgrade pausing are browser-only — the free tier is
a request, not a limit) and **E4** (admin reads broken for everyone; one `GRANT EXECUTE`).

**Second layer of defence (1):** **[3.2-grants]**. Not leaking, but RLS is the only wall.

**Client-state defect (1):** **C1** — see 5.4.

**Count: 31.**

---

## Gate C — handover work

The specification for the incoming team. This is "replace mock with real", and it is
expected work rather than a defect list.

**The scaffolding inventory (7):** **S1** (analytics dispatch seams), **S2** (muted
sources need a table), **S3** (quiet hours need server-side scheduling), **S4**
(`BASE_BRAND_VALUES` → catalog-derived reference prices), **S5** (prices from the billing
provider), **S6** (checkout + webhook instead of direct `plan` writes), **S7** (brand
price index behind the trend chip).

**The four big builds these imply**, called out because they are what the handover is
actually about: the **signals source parser** (unblocks M3 and every alerting claim), the
**price feed** (unblocks M1, M2, P5, F3, F5, S7), **billing** (unblocks M4, P1, L5, L6,
S5, S6), and **real email delivery** (unblocks M5, A1, and makes S3 meaningful).

**The five must-be-server-side items from 4.2** — consent records, notification
preferences, alert delivery / quiet hours, subscription lifecycle, muted sources — with
the table shapes, RLS, and named readers already specified in **4.3**. Note that the
*consent* item's local-key defect is **C1** and sits in Gate B; moving consent
server-side is the Gate C half of the same problem.

**Client-state defect (1):** **C2** — see 5.4.

**Housekeeping (1):** **[1.2-dead]** — delete `billing-mock.ts`'s unreferenced fake card
and invoices, and the legacy `lux_quiz_draft` key, before someone re-wires them.

**`pyou:onboarded:<userId>`** (4.2 "should be server-side") needs no work: the
authoritative flag already exists server-side.

**Count: 14** (7 S-items + the 5 server-side items + C2 + housekeeping; the four big
builds are the through-line, not separate ids).

---

## Gate D — post-launch hardening

Defence in depth and design work that should not hold a launch.

| Id | Work |
| --- | --- |
| **E2** | AAL2 as an RLS condition. A real design change touching every policy, needing a story for mid-session enrolment. The most interesting finding here and the wrong shape for a sprint. |
| **E1-residual** | Per-user rate limiting on recognition. Needs new storage — the contact/newsletter pattern counts rows in a destination table and recognition has none. Auth already removed the anonymous abuse. |
| **[3.5-storage]** | ~~`file_size_limit` and `allowed_mime_types` on `portfolio-photos`.~~ **SUPERSEDED — DONE, see 6.4.** Bucket set to 2 MB / `image/jpeg` only, with a client-side re-encode in front of it. Not Gate D work any more. |
| **[3.2-signals]** | ~~Scope the `SELECT true` policy to the user's own brands once signals are real.~~ **SUPERSEDED — see 6.1.** Decided: will not be scoped. Stays Gate D as an accepted, documented enumeration risk, revisited when signals stop being sample data. |
| **[3.2-removals]** | Add the `SELECT` grant, or leave it and document that `.insert().select()` will fail. Resolved in Phase 2 A3: no grant, write-only design documented at the insert site in `src/lib/portfolio.ts`. |
| **[3.5-profile]** | ~~Constrain `profiles.email` and the inert `alert_*` columns.~~ **SUPERSEDED — see 6.3.** The `profiles` half is done (column-level UPDATE grants; `email` and `plan` now fail `42501`). The `alert_*` half was misattributed — those columns are on `portfolio_items`, not `profiles` — and remains open at **Gate C**, to be done with the alerting build. |
| **E3** | **MOVED HERE FROM GATE B — see 6.2.** Editing non-`is_active` fields on an over-cap paused portfolio row. Both caps are already enforced by database triggers; no trigger built for the residual, because it would duplicate the paused-membership ordering contract between SQL and `splitPortfolioByPlan`. |

| **[3.3-iplimit]** | Real rate limiting for contact/newsletter, and either enable or delete the dormant reCAPTCHA branch. |

**Count: 7.**

---

## 5.4 C1 and C2 — bugs, not gaps. Where they go and why.

The five 4.2 items are *work the incoming team is expected to do anyway*. **C1 and C2 are
defects in code that will be handed over**, and unless someone names them they survive
into the real product regardless of how well the server-side work is done.

**C1 → Gate B. Agreed, and for the stated reason.** Four settings keys
(`luxtracker.consent.v1`, `lux.notifications.prefs.v1`, `lux.alert.delivery.v1`,
`lux.mutedAlertSources.v1`) are flat and global, and nothing clears them at sign-out. The
argument that puts it in Gate B rather than C is exactly the one made: **the server-side
migration does not fix it.** Stand up `consent_records` tomorrow, keep a globally-keyed
local cache in front of it, and account B still reads account A's cached decision before
the fetch resolves — and, worse, may write it back under B's identity, at which point the
bleed is now a durable server-side record attributing one person's consent to another. A
correct migration has to fix the key at the same time, so the fix belongs *with* launch,
not after it. It is also two lines of work: namespace the keys by user id, clear them on
sign-out. Cheap, and it fails silently if skipped.

**C2 → Gate C, and I'd argue against promoting it.** Tab desync is real and it silently
reverts a user's change, but its failure mode is *dissolved* by the Gate C work rather
than reproduced by it: once notification preferences and quiet hours live in one row that
both tabs fetch, "last writer wins on a whole-object localStorage overwrite" ceases to
have a subject. C1 is a keying bug that outlives the migration; C2 is a symptom of the
storage location the migration removes. The exception is `lux.mutedAlertSources.v1`, the
one key that *does* listen for `storage` — it is already correct and is the pattern the
others should copy if any of them stay local. If the team decides muted sources remain
client-side, C2 is promoted for that key alone.

Both are recorded as **bugs** in the handover notes, not as "future server-side work", so
that no one closes them by pointing at 4.3.

## 5.5 Findings that need no work

Verified true, or unverifiable-and-acceptable. Listed so nobody chases them: **L9**,
**P5** (true as a screen; the numbers are M1/M2), **A4**, **A6**, **F4**, **F6**, **F7**,
**S8**, the four honest Comparison ticks and five true FAQ answers in 2.4/2.5, and the
**3.6 correction** itself. **A3** and **A5** are true today but appear in Gate B as
regression guards rather than here.

**Does not fit the four gates (5), and forcing them in would be dishonest:** the three
**1.5** unverified items (signals provenance, auth email templates, `BASE_BRAND_VALUES`
accuracy) and the three **3.5 [U]** items (published-vs-local server-fn parity, whether a
real admin account exists, upstream AI gateway limits). These are not remediation work —
they are questions the audit could not answer from inside the repository. They need an
*answer*, not a fix, and the answer may create a finding or dissolve one. They belong in
the handover conversation, not in a gate. Two of them are cheap to resolve: publish-parity
is one call against the deployed URL, and the admin question is one query once
`user_roles` has a row.

## 5.6 Fixed during the audit window (2026-08-19)

So nobody chases work already done:

- **E1** — unauthenticated AI proxy. Auth middleware + server-side payload bound. Verified
  by re-running the original exploit. Recorded fixed in 3.3 and 3.0, original finding
  preserved.
- **The 3.6 correction** — Section 2's **L2** (2FA claimed but absent) was wrong. Two-factor
  is real Supabase MFA. L2 is struck through in place with the original text preserved;
  `terms.md` §3 and `privacy.md` §1 reclassified **True**; Section 2 counts revised to
  **True 23 / False 12**. The genuine weakness is **E2**, in Gate D.
- **Paused portfolio card** — the reduced read-only card for over-cap items was implemented
  earlier the same day and is what **A3** verifies as true. Note this is the *presentation*
  of the cap; the *enforcement* of it is **E3**, still open in Gate B.
- **Plan-copy work** — the disabled plan buttons with honest sub-copy, verified in 2.7 and
  backed by `enforce_plan_immutable`. **P1** remains open: the landing "Go Pro" link is a
  separate surface.
- **Hover-glow CSS** (`d2c68d9`) — cosmetic, presentational only. Recorded because it
  landed inside the audit window; it touches nothing any section describes.

## 5.7 Counts

| Gate | Count | Meaning |
| --- | --- | --- |
| **A — true now** | **1** (1 done, 0 open) | E1 only |
| **B — blocks launch** | **31** | before a real user or a real payment |
| **C — handover** | **14** | replace mock with real |
| **D — post-launch** | **7** | defence in depth |
| No gate — no work | 12 + the 3.6 correction | verified true |
| No gate — open questions | 6 | need an answer, not a fix |

**Every finding id in Sections 1–4 appears in exactly one bucket above.** Full roll-call:
M1–M5, S1–S8, L1–L9, P1–P6, A1–A6, F1–F8, E1–E4, C1, C2, the 3.6 correction, the seven
location-routed unnumbered findings, and the six unverified items. The only ids that
appear twice *in prose* are cross-references (e.g. P5 pointing at M1/M2); each is assigned
once.

---

# Section 6 — Phase 2/3 decisions of record

Decisions taken after Section 5 was written. Recorded here because this document, not
the chat log, is the handover artefact.

## 6.1 `[3.2-signals]` — will not be scoped. Accepted risk, stays Gate D.

Every authenticated user can read every row of `signals` (`USING (true)`). The proposal
was to scope the policy to the brands the user follows. **Decision: do not scope.**

Reasons:

1. **It needs a schema change plus a sync trigger.** Neither `watchlist` nor
   `portfolio_items` has a `brand_slug` column — both store a display `brand` string.
   `signals` keys on `brand_slug`. A scoping policy therefore needs a denormalised slug
   column on both tables and a trigger to keep it in step with the brand text on every
   insert and update. That is new machinery on the write path in order to narrow a read.
2. **It retroactively hides history.** Membership would be evaluated at read time, so
   removing a brand from the watchlist or selling a piece would erase that brand's past
   signals from the feed — and from the dashboard counters that aggregate them. The feed
   would silently disagree with what the user was shown last week.
3. **It protects facts the marketing site advertises.** Rows are non-identifying market
   observations about brands the public landing and blog name openly. Scoping hides
   nothing an enumerator could not read elsewhere.

**Residual risk, accepted and documented:** an authenticated user can enumerate the full
signal corpus. Revisit when signals stop being sample data and carry anything
proprietary — that is the trigger condition, not a date.

## 6.2 E3 — downgraded to Gate D. No trigger.

**What is already enforced at the database.** Both caps have `BEFORE` triggers:
`enforce_portfolio_free_cap` (INSERT, 3 items) and `enforce_watchlist_free_active_cap`
(INSERT and UPDATE, 10 active rows). Both are `plpgsql`, so a batched multi-row insert
cannot slip past the count. A free user cannot create a fourth piece or activate an
eleventh watchlist row by any route, API included.

**What remains unenforced.** Only this: a free user with more than three pieces can edit
the non-`is_active` fields — notes, target price, alert thresholds — of a row the UI
renders as paused. No new row is created and no entitlement is gained; the alert fields
are inert until alerting is real.

**Why the trigger was not built.** Paused-membership is an *ordering* contract: the
oldest three by `(created_at, id)` are live, the rest paused. `splitPortfolioByPlan`
computes it in TypeScript. A blocking `UPDATE` trigger would have to recompute the same
ranking in SQL, so the contract would exist in two places. Any later change to the
ordering — a manual pin, a different tiebreak, a per-plan cap — that lands in one and not
the other makes the database and the UI disagree about *which* row is locked, and the
failure is a user editing a card the UI shows as editable and getting a raise. A
duplicated ordering rule is a worse defect than the metadata edit it prevents.

**Moved from Gate B to Gate D.** The correct fix, when it is worth doing, is to put the
ordering in one place — a generated column or a view the UI reads — and gate on that.

## 6.3 `[3.5-profile]` — correction. Half done, half misattributed.

The original finding named `profiles.email` and the inert `alert_*` /
`quiz_completed` / `onboarding_completed` columns together. Two separate things:

- **`profiles` half — done (Phase 2 A4).** `authenticated` lost blanket
  INSERT/UPDATE/DELETE and holds column-level UPDATE on exactly `display_name`,
  `avatar_url`, `segments`, `categories`, `brands`, `role`, `quiz_completed`,
  `onboarding_completed`. `email` and `plan` now fail with `42501`.
- **`alert_*` half — misattributed, still open.** Those columns are on
  **`portfolio_items`**, not `profiles`, and were never in scope of the A4 grant change.
  A user can freely set `alert_below_*` / `alert_above_*` / `signal_every_move` on their
  own rows. Harmless while alerting is unimplemented; becomes a cost and quota surface
  the day it is real. **Stays open, Gate C** — it belongs with the alerting build, not
  before it.

## 6.4 Phase 3 — `[3.5-storage]` closed. Bucket bounded, uploads resized.

**Bucket (`portfolio-photos`).** `file_size_limit = 2 MB (2097152)`,
`allowed_mime_types = ['image/jpeg']`. The size limit was chosen *after* the resize
output, not before: the client re-encodes to JPEG at quality 0.82 with a 1600 px long
edge. A worst-case incompressible 4000×3000 noise source measured 750 KB out; ordinary
photographs land well under that. 2 MB is roughly 2.5× the measured worst case — enough
headroom that no legitimate resized upload is refused, tight enough to be a real backstop
against a direct API upload that skips the client entirely.

**Client resize (`prepareImageForUpload`, `src/lib/image-crop.ts`).**

- **Accepted input:** `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.
  The file picker's `accept` was narrowed from `image/*` to that list.
- **Output:** always `image/jpeg`, ≤1600 px long edge, quality 0.82 — so the encoded
  output satisfies the bucket allowlist regardless of what went in.
- **HEIC.** iPhone photos are frequently `image/heic`/`heif` and **canvas cannot decode
  them in Chrome or Firefox** — only Safari. HEIC is detected up front by MIME type or
  file extension and refused with a specific, actionable message rather than a decode
  failure: *"This looks like an iPhone HEIC photo, which this browser can't read. On
  iPhone: Settings › Camera › Formats › Most Compatible, or share the photo as JPEG, then
  try again."* Any other undecodable file gets *"This image couldn't be read by your
  browser. Try saving it as a JPEG and uploading again."*
- **No fallback to the original.** If resize fails for any reason the upload aborts with
  a message. Silently uploading the raw file would defeat both the bucket ceiling and the
  point of the change.
- The 8 MB client pre-check is retained as a first gate. It is now a courtesy, not the
  control.

**Verified.** A 7.1 MB 4000×3000 JPEG uploaded end to end: stored at 750 277 bytes,
`image/jpeg`, `photo_path` set, preview rendered in the modal, and still displayed at
1600×1200 through the signed-URL path after a full reload. Swap-photo left the object
count unchanged while `photo_path` moved (new object in, superseded object deleted);
remove-photo dropped the count by one and nulled `photo_path`. Direct API uploads with a
valid session, previously proved to succeed, now fail at the bucket:

| Attempt | Result |
| --- | --- |
| 3 MB random binary, `application/octet-stream` | `400 InvalidMimeType` — *mime type application/octet-stream is not supported* |
| HTML file, `text/html` | `400 InvalidMimeType` — *mime type text/html is not supported* |
| 3 MB payload declared `image/jpeg` | `413 EntityTooLarge` — *The object exceeded the maximum allowed size* |

Throwaway account and all its storage objects removed after testing.
