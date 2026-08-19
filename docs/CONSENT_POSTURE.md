# Consent posture — note for counsel

Status: **open question, no live breach.** This note describes what the code does
today and where it diverges from what an EU-facing controller would normally do.
It deliberately does not decide anything. Nothing here has been "fixed" beyond a
UI bug (the banner previously had a close control that dismissed without
recording a choice, so it reappeared every load).

## 1. The stated posture

`src/components/consent/CookieBanner.tsx` describes itself as a
**"US-focused cookie notice (CCPA/CPRA style)"** with a single acknowledgment,
on the stated basis that US law does not require prior consent for most cookies.
The CPRA "Do Not Sell or Share My Personal Information" opt-out is present in the
body copy and wired to `rejectAll`.

## 2. The mismatch

The controller is **NORELIX LIMITED**, Dublin, Ireland (see
`src/content/legal/billing.md` §10). For EU/EEA visitors, ePrivacy and GDPR
plausibly apply, under which:

- prior consent is required before non-essential cookies/technologies are set; and
- refusal must be as easy as acceptance.

A US-style acknowledge-only notice does not, on its face, meet that.

## 3. What the code actually does today

- `DEFAULT_CONSENT_PREFS` (`src/lib/consent-storage.ts`): `necessary: true`,
  `functional: false`, `analytics: false`, `marketing: false`. Default is refusal
  for everything non-essential.
- "Got it" (`acceptAll` in `src/lib/consent.tsx`) sets `functional`, `analytics`
  and `marketing` to true.
- **Global Privacy Control**: when `navigator.globalPrivacyControl === true`,
  `marketing` is forced false even on "Got it".
- `CONSENT_VERSION` ("2026-07-06"): a stored record whose version does not match
  is treated as absent, so bumping the constant re-prompts everyone.
- The banner now offers **Reject all** (`btn-secondary`), **Preferences**
  (`btn-secondary`) and **Got it** (`btn-primary`) at every breakpoint. Reject and
  accept carry equal visual weight; there is no dismiss-without-recording control.

## 4. Nothing non-essential fires before consent

This is an **interface gap, not a live breach**:

- every `injectScript(...)` call inside `applyConsent()` is currently commented
  out — no GA4, Amplitude, Clarity, Meta Pixel, Google Ads or AppsFlyer tag is
  actually loaded; and
- `track()` in `src/lib/analytics.ts` has been consent-gated since the vendor-seam
  change, and the gate (`hasConsent`) fails closed on SSR, missing records,
  version mismatch and malformed JSON.

No over-correction is warranted on the basis of current data flows. The exposure
would begin the moment a real vendor snippet is uncommented.

## 5. Client-only consent record (GDPR Art. 7(1) accountability)

The consent record lives **only in localStorage**, under the key
`luxtracker.consent.v1` (`{ prefs, timestamp, version }`). There is no
server-side record that a choice was made, by whom, or when. Under GDPR Art. 7(1)
the controller must be able to demonstrate consent; a record the user can clear,
and which never reaches us, is weak evidence.

This is one instance of a wider **client-only-state** problem in the app, which
also covers:

- muted alert sources (`src/lib/muted-sources.ts`),
- notification preferences, and
- quiet hours (`src/lib/alert-delivery.ts`, which also evaluates against the
  browser's local clock).

Any decision to add server-side consent storage should be taken together with
those, not in isolation.

## 6. Open questions for counsel

1. **One banner or geo-detection?** Serve a single EU-grade consent flow to
   everyone, or detect jurisdiction and vary the notice? Geo-detection adds an
   accuracy/VPN failure mode and its own data processing.
2. **Server-side counterpart?** Does the Art. 7(1) accountability requirement
   oblige us to persist consent records server-side (and for authenticated users,
   tie them to the account), or is the client record sufficient given that no
   non-essential processing currently occurs?
3. **Retention of a refusal.** How long should a refusal be honoured before the
   user may be re-prompted? Today a refusal persists until localStorage is
   cleared or `CONSENT_VERSION` is bumped, with no stated period.

No change to `CONSENT_VERSION`, the storage key, `DEFAULT_CONSENT_PREFS`, or any
legal markdown has been made in connection with this note.
