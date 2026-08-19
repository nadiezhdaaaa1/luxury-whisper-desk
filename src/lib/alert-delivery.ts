// Frontend-only "Alert delivery" (quiet hours) state.
// Mirrors the pattern in notifications-mock.ts: localStorage + a change event.
//
// NOTE: this is cosmetic — client-side state cannot stop a server sending an
// email at 3am. Real enforcement needs a `quiet_hours` jsonb column on
// profiles plus a server-side check at send time.

const KEY = "lux.alert.delivery.v1";
const EVENT = "alert-delivery-change";

export type QuietDays = "every" | "weekdays" | "weekends";
export type QuietOnEnd = "summary" | "skip";
export type AlertRhythm = "instant" | "daily" | "weekly";
export type MinMove = 0 | 3 | 5 | 10;

export type AlertDelivery = {
  quiet_hours_enabled: boolean;
  from: string;
  to: string;
  timezone: string;
  days: QuietDays;
  on_end: QuietOnEnd;
  allow_price_rise: boolean;
  rhythm: AlertRhythm;
  min_move: MinMove;
};

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const DEFAULT_ALERT_DELIVERY: AlertDelivery = {
  quiet_hours_enabled: false,
  from: "22:00",
  to: "08:00",
  timezone: "UTC",
  days: "every",
  on_end: "summary",
  allow_price_rise: true,
  rhythm: "instant",
  min_move: 0,
};

export function getAlertDelivery(): AlertDelivery {
  const base = { ...DEFAULT_ALERT_DELIVERY, timezone: detectTimezone() };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    // timezone always reflects the device; a stale stored value must not apply.
    return { ...base, ...(JSON.parse(raw) as Partial<AlertDelivery>), timezone: base.timezone };
  } catch {
    return base;
  }
}

export function setAlertDelivery(patch: Partial<AlertDelivery>): AlertDelivery {
  const next = { ...getAlertDelivery(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore quota errors
  }
  return next;
}

export function onAlertDeliveryChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// ---------- window math ----------

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function dayAllowed(days: QuietDays, weekday: number): boolean {
  const isWeekend = weekday === 0 || weekday === 6;
  if (days === "every") return true;
  if (days === "weekends") return isWeekend;
  return !isWeekend;
}

/**
 * True when `now` falls inside the configured quiet window.
 * Handles the overnight wrap (from > to) and the day filter. For a wrapped
 * window, the day filter is applied to the day the window started on.
 *
 * DELIBERATE: this evaluates against the BROWSER'S LOCAL CLOCK
 * (`now.getHours()` / `now.getDay()`), not against `s.timezone`. `s.timezone`
 * is display-only and is always overwritten with the device zone in
 * `getAlertDelivery()`. Do not make the timezone user-editable here: an
 * editable field would look like it moved the window while this function kept
 * using the device clock — the exact trap we removed. Honouring a
 * user-selected timezone belongs to the server-side send-time check, which is
 * where quiet hours can actually be enforced.
 */
export function isWithinQuietHours(now: Date, s: AlertDelivery): boolean {
  if (!s.quiet_hours_enabled) return false;
  const from = toMinutes(s.from);
  const to = toMinutes(s.to);
  const cur = now.getHours() * 60 + now.getMinutes();
  const weekday = now.getDay();

  if (from === to) return false;

  if (from < to) {
    return cur >= from && cur < to && dayAllowed(s.days, weekday);
  }
  // wrapped: 22:00 -> 08:00
  if (cur >= from) return dayAllowed(s.days, weekday);
  if (cur < to) {
    const startDay = (weekday + 6) % 7; // window began yesterday
    return dayAllowed(s.days, startDay);
  }
  return false;
}

/** Human status line for the card footer. */
export function quietHoursStatus(now: Date, s: AlertDelivery): string {
  if (!s.quiet_hours_enabled) return "Quiet hours off — alerts arrive as they happen.";
  return isWithinQuietHours(now, s)
    ? `Quiet until ${s.to}`
    : `Next quiet window starts at ${s.from}`;
}
