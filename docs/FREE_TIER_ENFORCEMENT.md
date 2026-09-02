# Free-tier enforcement — REMOVED (Aug 2026)

There is no Free *tier* any more — that part is unchanged. What did change
(Sep 2026) is the trial: monthly now starts with a 14-day free trial (card
required, $0 today, then $24.99/month), while quarterly and annual are bought
immediately with no trial. Either way nothing grants a permanently free,
capped plan, so the two cap triggers that enforced the Free tier were dropped,
along with their functions:

| Dropped | Table | Enforced |
| --- | --- | --- |
| `enforce_portfolio_free_cap` | `public.portfolio_items` | max 3 rows on Free |
| `enforce_watchlist_free_active_cap` | `public.watchlist` | max 10 active rows on Free |

The matching client-side machinery went with them: `FREE_PORTFOLIO_CAP`,
`FREE_ACTIVE_CAP`, `portfolioCapFor`, `activeCapFor`, `pickPromotion`,
`splitPortfolioByPlan`, `readOnlyPortfolioIds`, `src/lib/cap-errors.ts` and
`ApproachingLimitBanner`.

## What is still enforced

`enforce_plan_immutable` on `public.profiles` is untouched and must stay:
`plan` / `billing_period` can only change via `service_role` (raises `42501`
otherwise), which is what makes the billing seam — today
`src/lib/mock-provision.functions.ts`, later the Stripe webhook — the only way
to grant paid access.

## Nothing currently gates access

The caps were the app's only entitlement enforcement. Every account, including
rows still carrying `profiles.plan = 'free'`, now has unlimited portfolio and
watchlist. That is deliberate for now; the real gate arrives with billing.
No `profiles` rows were reassigned by the removal.

## `watchlist.is_active` stays

It is a user-controlled pause — the user chooses to stop alerts for a brand.
The Free cap merely piggybacked on it. Nothing pauses a row on the user's
behalf any more: not downgrade, not removal, not a backfill.
