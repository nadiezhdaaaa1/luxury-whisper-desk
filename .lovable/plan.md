## Goal

Replace the copy in the six existing legal pages with the new legal-team drafts, and add a new DMCA Copyright Policy page linked from the footer.

## Content updates (rewrite from the new DOCX files)

Convert each DOCX to clean Markdown matching the existing shape used by `LegalPage` (H1 title, `**Last updated / Effective date:** [DATE]`, then `## N. SECTION` headings, standard lists / bold, internal links as `/route`):

- `src/content/legal/terms.md` ← `TERMS_OF_SERVICE_2.docx` (notably an expanded §2 "Description of the Service" covering brand subscriptions, price/resale signals, photo-based portfolio, and estimated valuations — matches the Telegram note from Kath).
- `src/content/legal/privacy.md` ← `PRIVACY_POLICY_2.docx`
- `src/content/legal/billing.md` ← `SUBSCRIPTION_BILLING_TERMS.docx`
- `src/content/legal/refunds.md` ← `REFUND_CANCELLATION_POLICY.docx`
- `src/content/legal/disclaimer.md` ← `FINANCIAL_VALUATION_DISCLAIMER.docx`
- `src/content/legal/cookies.md` ← `COOKIE_POLICY.docx`

Preserve `[DATE]` placeholder in each (the page always renders "Last updated: July 6, 2026" from `LegalPage`'s prop, so body date is stripped by the renderer — same as today).

## New page: DMCA Copyright Policy

- `src/content/legal/dmca.md` ← `DMCA_COPYRIGHT_POLICY_2.docx`, same shape as the others (H1 "DMCA Copyright Policy", section headings, list of what a notice must contain, counter-notice, repeat infringers).
- `src/routes/dmca.tsx` — mirror of `src/routes/cookies.tsx`: `createFileRoute('/dmca')`, head with title `DMCA Copyright Policy — LuxTracker` and description, renders `<LegalPage content={content} />`.
- `src/components/landing/Footer.tsx` — add `{ to: "/dmca", label: "DMCA Copyright" }` to the `legalLinks` array (keeps the existing two-column layout; will sit alongside "Cookie Policy" in the second column).

## Callout for the user (from Kath's Telegram message)

Kath flagged that the email addresses inside the DMCA doc may not be correct. The doc uses:
- `dmca@luxtracker.com` (designated agent / notices)

I'll ship the page verbatim from the doc, but confirm after the change whether that address is real or should be swapped (e.g. to `legal@luxtracker.com` or `hello@luxtracker.com`).

## Out of scope

- No design/layout changes to `LegalPage`.
- No changes to the "Last updated" date shown on the page (stays `July 6, 2026`, controlled by `LegalPage` prop). Ask if you want it bumped.
