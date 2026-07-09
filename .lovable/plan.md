# Rebrand LuxTracker → Price.you + new logo

## 1. Upload the new logo as a CDN asset

- `lovable-assets create --file /mnt/user-uploads/Price_you_Logo.svg --filename price-you-logo.svg > src/assets/price-you-logo.svg.asset.json`
- Import the pointer where the wordmark is rendered.

## 2. Replace the wordmark in all four render sites

Swap the `<span>LUX</span><span>TRACKER</span>` Montserrat wordmark for an `<img src={logo.url} alt="Price.you" />` sized to the current wordmark height (~20–24px). Files:

- `src/components/landing/Navbar.tsx` (line 23–25)
- `src/components/landing/Footer.tsx` (line 32–34)
- `src/components/auth/AuthLayout.tsx` (line 20–26)
- `src/components/app/DashboardShell.tsx` (line 88–96)

Drop the inline `fontFamily: 'Montserrat'` on those elements.

## 3. Text rename: "LuxTracker" → "Price.you"

Rename every UI/marketing/legal *narrative* reference. Includes:

- Route `head()` titles + meta descriptions + `og:title`/`og:description` in `src/routes/*.tsx` (login, signup, quiz, contact, blog.index, blog.$slug, terms, privacy, cookies, disclaimer, dmca, refunds, billing, reset-password, forgot-password, index).
- On-page copy: `src/routes/login.tsx` subtitle, `src/routes/signup.tsx` eyebrow, `src/routes/contact.tsx`, `src/routes/blog.index.tsx`.
- Landing components under `src/components/landing/*` (Hero, FAQ, Comparison, Features, HowItWorks, Pricing, Footer disclaimer, etc.).
- Legal markdown: `src/content/legal/*.md` — replace narrative "LuxTracker" with "Price.you". **Keep `NORELIX LIMITED` as the legal entity name** (it's a company registration, not the brand); rephrase "trading as 'LuxTracker'" → "trading as 'Price.you'".
- Seed blog posts in `supabase/migrations/20260709102303_*.sql` — rename in-body "LuxTracker" → "Price.you" and "The LuxTracker Team" → "The Price.you Team". (Migration already ran; this only affects future re-seeds. No new migration needed.)
- `docs/DESIGN_SYSTEM.md` title + wordmark note.
- `src/lib/consent.tsx`: keep `STORAGE_KEY = "luxtracker.consent.v1"` unchanged (renaming would reset consent for existing users). Add a comment noting the legacy key.

## 4. Emails and support addresses

Leave `hello@luxtracker.com`, `billing@luxtracker.com`, `privacy@luxtracker.com`, `security@luxtracker.com` unchanged — the `price.you` domain isn't confirmed to exist and swapping to broken addresses would break contact flows. Callout in the summary so the user can request a follow-up rename once a domain is confirmed.

## 5. Favicon

- Reuse the same SVG as favicon: add `public/favicon.svg` by copying the uploaded SVG into `public/`, wire in `src/routes/__root.tsx` `head().links` as `{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }`.
- Delete the default `public/favicon.ico` and remove the existing ico link entry.

## 6. Verify

`bun run build` (auto-runs). Spot-check nav/footer/auth/dashboard render the new logo image and that page titles read "Price.you".

## Out of scope

- Email address rename (see §4).
- Renaming Supabase auth email templates or the localStorage consent key.
- New migration for existing seed blog rows — the DB copy stays until the user asks for a data migration.
