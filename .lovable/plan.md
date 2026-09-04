# Account before payment: registration as a pop-up at every plan decision

Every place a visitor picks a plan becomes one shared decision point: remember the plan, make sure there is an account, then send them to checkout. Payment never creates accounts, and the "pay with just an email" door closes.

## What changes for a visitor

1. Clicks a plan card (landing, funnel link, or preview screen) → the plan is remembered immediately.
2. Not signed in → a registration pop-up opens in place (Google, or email + 6-digit code — no password here).
3. Signed in and already paying → goes to the subscription area of Settings instead of a second checkout.
4. Otherwise → straight to checkout for the plan they picked.
5. After paying, answering the short questionnaire is required before the dashboard.

Closing the pop-up loses nothing: the plan choice stays remembered, and no page change happens.

## Build steps

### 1. Shared sign-in logic — `src/lib/auth/authActions.ts`
Extract the Google + one-time-code logic that currently lives inside `AhaRevealV3` (`googleSignup`, `sendCode`, `verifyCode`, `friendlyOtpError`, the 30s resend cooldown, "change email"). `AhaRevealV3` then consumes it with no behavior change. Password logic in `/signup` is untouched.

### 2. `src/components/auth/RegistrationModal.tsx`
Built on `src/components/ui/dialog.tsx`. One dialog, both directions (an existing email signs in rather than erroring). All states render inside: email entry, code entry with the address shown, resend with cooldown, change email, errors. Google button primary, email below. Terms/Privacy line as on `/signup`, consent stashed on signup only. `onAuthed` callback — the modal never navigates. ESC/backdrop close, focus trap.

### 3. `src/lib/onboarding/usePlanFlow.ts`
`selectPlan({ plan })` → save intent first; no session → open modal, resume on `onAuthed`; subscribed → Settings subscription section (`/app/settings#plans`, the existing anchor); else `/checkout?plan=…`. Option `commitBeforeCheckout` runs the questionnaire save after auth, before redirect. For Google, a `postAuthPath` sessionStorage key pointing at `/checkout?plan=…` (a public route, so no modal loop), cleared on success, error, and modal close.

### 4. Surfaces
- **Landing pricing** (`Pricing.tsx`): each card's `<Link to="/checkout">` becomes `selectPlan({ plan: p.id })`. Markup, frames, badges, disclosure untouched. No period toggle introduced.
- **Preview screen, public** (`/quiz`): the "Then pick a plan" chips become the decision point → `selectPlan` with `commitBeforeCheckout`; the existing inline auth panel stays but runs on the extracted actions. Today this path sends people to `/app` after auth — that ends; a public visitor never lands unpaid on `/app` without their answers saved.
- **Preview screen, in-app** (`/app/quiz` → `RevealAccessPanel`): unsubscribed → the three options route through `selectPlan`; subscribed → unchanged locked-plan card plus "Continue to your dashboard".
- **Funnel arrival** (`src/routes/index.tsx`): accept `?plan=` only, validate against the three ids, save, strip the param, then auto-open the modal behind a one-shot guard. Invalid value ignored silently. Signed-in visitors get the same branching as step 3.

### 5. Questionnaire save points
`saveQuizAnswersV3` stays one atomic update. It runs exactly at (a) the public preview path after auth, before the checkout redirect, and (b) the in-app subscribed continue button. Any "already done" client flag stays scoped per account id, as `use-seed-watchlist.ts` already does. That hook's ordering hazard gets fixed: make the watchlist seeding idempotent (no-op when rows already exist) and safe to re-run, so the flag is an optimization rather than the only protection. `quiz_completed` (answers) and `onboarding_completed` (watchlist seeded) stay distinct.

### 6. Route gate — `src/routes/_authenticated/route.tsx`
Becomes the single routing table, reading the existing `getAccessState()` through the `["access"]` query (one call per window): no session → `/login` with the current `redirect` param; no credentials → `/onboarding/credentials`; unpaid + not onboarded → `/quiz`; unpaid + onboarded → Settings subscription section; paid + not onboarded → `/app/quiz`; otherwise the requested page. `/app/settings`, `/onboarding/credentials` and `/app/quiz` are exempt from redirecting to themselves.

### 7. Settings subscription section
Three states with distinct copy, reusing `SubscriptionStateCard`: cancelled by choice (reactivation, restart preseeded with the previous period); cancelled after a failed payment (no re-sell pitch — acknowledge the billing problem, offer to fix the card and restart); never subscribed (first-purchase framing).

### 8. Checkout needs an account
`/checkout` stops asking anonymous visitors for an email: it preserves the plan and routes them into registration, returning to `/checkout?plan=…` once signed in. Signed-in behavior unchanged. `startAnonCheckout` / `mintCheckoutSession`, `/checkout/return`, `/onboarding/credentials` and `needs_credentials` stay in the codebase as legacy safety nets, with no live path feeding them. `/checkout/success` untouched.

### 9. Analytics
Via existing `track()`: modal opened (with `source` = `landing_card` | `funnel_param` | `aha_public` | `aha_in_app`, plus plan), auth succeeded (with method), checkout redirect. All current events kept.

## Assumptions

- Plan intent is stored in `sessionStorage` (survives the Google redirect within the tab, does not leak across tabs or persist for weeks). Say the word if you want it longer-lived.
- The Settings destination is the existing `#plans` anchor on `/app/settings`; no new route.
- "Has ever subscribed" is derived server-side inside `getAccessState` from existing profile columns — a never-subscribed account has `plan='free'` with `billing_period`, `access_until` and `past_due_since` all null, while every churned account has at least one of them set. **No migration needed.** If you want a hard audit trail instead of a derivation, that would need a new `first_subscribed_at` column — I'd rather not add it speculatively.
- Dunning vs voluntary cancellation is distinguished by `past_due_since` being non-null alongside `billing_status = 'canceled'`.
- The modal reuses the existing OTP settings (code creates the user if absent), so no auth configuration changes.
- The public preview screen keeps its inline auth panel; the modal is not used there.

## Contradictions in the current code, flagged

- **`AhaRevealV3` hard-navigates to `/app` after auth** (`window.location.href = "/app"`), including from the "Continue anyway" save-failure escape. Under the new gate an unpaid, un-onboarded account at `/app` bounces to `/quiz`; the escape hatch needs a destination that respects the gate.
- **`/checkout` currently treats the anonymous buyer as the designed path** (email field, `startAnonCheckout`, "Your receipt and account go to this address"). That copy and branch are removed from the live path.
- **`PAYWALL_CARDS` entries carry an `href: "/checkout?plan=…"`** field. Once cards call `selectPlan`, that field is dead for the landing surface; I'll leave the data untouched unless you want it removed.
- **`RevealAccessPanel` already links straight to `/checkout`** for unsubscribed users; that becomes `selectPlan` so a single code path owns the branch.
- **The A-ha in-app "all set" path calls `finish()`** which only invalidates queries and navigates — the questionnaire commit for that surface currently happens elsewhere; I'll confirm it runs exactly once at that point.
