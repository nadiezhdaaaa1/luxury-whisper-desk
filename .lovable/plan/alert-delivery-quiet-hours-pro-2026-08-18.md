# Alert delivery & quiet hours (Pro)

Make the "Advanced notifications and quiet hours" pricing bullet true: add a real Alert delivery settings card, gate it to Pro, and remove the duplicated pricing array that let the copy drift in the first place.

## What the user sees

**Pro accounts** — a new "Alert delivery" card in Settings, sitting between Email notifications and Muted alert sources:

- Header row: `Moon` chip + "Control when alerts reach you, and how loud they are. Signals still arrive — you choose the time." + a Pro badge.
- "Quiet hours" master switch — "Hold non-urgent alerts during set hours".
- When on, the rest reveals (collapsible, ~200ms, no animation under reduced motion):
  - From / To time fields (native `<input type="time">`, visible labels).
  - Timezone line, auto-detected, with a "Change" affordance.
  - Days: Every day / Weekdays / Weekends.
  - When quiet hours end: "Deliver held alerts as one summary" (default) or "Skip them entirely".
  - "Let retail price-rise alerts through" — **on by default**, with "Retail increases are time-sensitive — most collectors keep this on." The product's promise is knowing before the market moves; a blanket overnight mute would undercut it.
  - Alert rhythm: Instant / Daily digest / Weekly only.
  - Minimum move: Any move / 3% / 5% / 10%.
- Live status strip at the bottom: "Quiet until 08:00 · 2 alerts waiting" inside the window, otherwise the next window start. This is the proof the settings took effect.

**Free accounts** — the same card, locked rather than hidden: dimmed rows, a `Lock` glyph, and an upgrade row where the master switch would sit, linking to the plan section. Hiding it would repeat the same inconsistency from the other side — read the bullet, open settings, find nothing.

## Honest limitation (please read)

This pass stores everything in the browser, matching how the rest of the notification settings work today. That means **quiet hours are cosmetic**: client-side state cannot stop a server from sending an email at 3am. The mock email path will respect the window so the held/skipped behaviour is demonstrable, but real enforcement needs the backend work listed below. I'd treat that as a required follow-up before the bullet is fully truthful in production.

## Files

Add:
- `src/components/settings/AlertDeliveryCard.tsx` — the card, both Pro and locked-Free states.
- `src/lib/alert-delivery.ts` — state, persistence, window math.

Change:
- `src/routes/_authenticated/app/settings.tsx` — render `<AlertDeliveryCard plan={profile?.plan} />` between the two existing notification cards (currently lines 548–549); `id="alert-delivery"`.
- `src/lib/notifications-mock.ts` — `sendMockEmail()` consults the quiet-hours window.
- `src/components/landing/Pricing.tsx` — import `PLAN_DEFS` from `@/lib/subscription` instead of its local `plans` array.

## Technical notes

**State shape** (`src/lib/alert-delivery.ts`, key `lux.alert.delivery.v1`, same localStorage + `CustomEvent` + `track()` pattern as `notifications-mock.ts`):

```ts
type AlertDelivery = {
  quiet_hours_enabled: boolean;   // false
  from: string;                   // "22:00"
  to: string;                     // "08:00"
  timezone: string;               // Intl.DateTimeFormat().resolvedOptions().timeZone
  days: "every" | "weekdays" | "weekends";
  on_end: "summary" | "skip";     // "summary"
  allow_price_rise: boolean;      // true
  rhythm: "instant" | "daily" | "weekly";
  min_move: 0 | 3 | 5 | 10;
};
```

Exports: `getAlertDelivery()`, `setAlertDelivery(patch)`, `onAlertDeliveryChange(cb)`, and `isWithinQuietHours(now, s)` handling the overnight wrap (from > to) and the day filter.

**Pro gating** — read `profile.plan` from the existing `useQuery(["me"], fetchMyProfile)` in settings.tsx and pass it as a prop; no new fetch. Locked mode renders the same markup with `aria-disabled`, disabled controls, and the upgrade row. Gating is presentational only — nothing here is a security boundary.

**Mock email** — in `sendMockEmail()`, after the existing channel opt-out check: if quiet hours are active and the template isn't an allowed price-rise (when `allow_price_rise`) or a required channel (`plan_updates`, `security_alerts`), mark the log entry `skipped: "quiet_hours_held"` or `"quiet_hours_skipped"` per `on_end`, and suppress the toast. The status strip counts held entries from the existing log.

**Real version (not this pass)** — a `quiet_hours` jsonb column on `profiles`, written from this card, plus a server-side check at send time that holds or drops the message and flushes held items in one summary when the window closes.

**Styling** — existing card recipe (`rounded-2xl border border-hairline bg-background overflow-hidden`, hairline-divided rows, `font-display` labels + `text-xs text-muted-foreground` descriptions), semantic tokens only, lucide icons only, ≥44x44 targets, every switch/time field labelled.

## Conflicts worth flagging

- `notifications-mock.ts` already owns a "weekly_digest" channel; the new "Alert rhythm: Weekly only" overlaps conceptually. Plan: rhythm governs price alerts only, and the copy will say so — I won't touch the digest channel.
- `Pricing.tsx` uses `href`/`cta` fields that `PLAN_DEFS` doesn't carry. The import swap adds a small local map from `PlanDef.id` to `{ cta, href }` in `Pricing.tsx`, keeping prices, names and benefits single-sourced. Rendered copy stays byte-identical.
- Muted sources and quiet hours are two different mute concepts on the same page; the new card's explainer will make the distinction (who vs when) explicit.
