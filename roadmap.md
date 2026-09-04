# Roadmap

## Account-before-payment flow (in progress)

- [x] Shared OTP/Google auth actions (`src/lib/auth/authActions.ts`)
- [x] Plan intent store (sessionStorage) + post-auth path
- [x] `RegistrationModal` on dialog primitives
- [x] `usePlanFlow` hook owning every plan decision
- [x] Landing pricing cards, funnel `?plan=`, A-ha public, A-ha in-app
- [x] Route gate driven by `getAccessState()`
- [x] `has_ever_subscribed` derived server-side
- [x] Settings subscription states (never subscribed / cancelled / dunning)
- [x] Checkout requires a session
- [x] Idempotent watchlist seeding
- [x] Analytics events
