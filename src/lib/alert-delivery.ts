// "Alert delivery" (quiet hours) state.
//
// Persisted in `public.notification_settings` (one row per user, owner-only
// RLS) rather than localStorage, so the settings follow the account instead of
// the browser. See `notification-settings.ts` for the shared row access, the
// lazy-create behaviour, and the deliberate non-migration of the old
// localStorage key `lux.alert.delivery.v1`.
//
// NOTE: storage is server-side; ENFORCEMENT is not. Nothing in the app sends
// email yet, so these values describe intent only. Real enforcement needs a
// server-side check at send time.

import { useCallback } from "react";
import {
  useNotificationSettings,
  useNotificationSettingsMutation,
} from "@/lib/notification-settings";

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

/**
 * Alert-delivery settings for the signed-in user.
 *
 * `ready` is false until the row (or its confirmed absence) has loaded; render
 * a placeholder rather than the defaults while it is false, so a switch never
 * visibly flips after hydration.
 *
 * `timezone` is always the DEVICE zone, never the stored column — see
 * `isWithinQuietHours` below. The stored column is written on every save so the
 * value exists for a future server-side sender, but nothing reads it back.
 */
export function useAlertDelivery(): {
  settings: AlertDelivery;
  ready: boolean;
  update: (patch: Partial<AlertDelivery>) => void;
} {
  const { row, ready } = useNotificationSettings();
  const { save } = useNotificationSettingsMutation();

  const settings: AlertDelivery = {
    quiet_hours_enabled: row?.quiet_hours_enabled ?? DEFAULT_ALERT_DELIVERY.quiet_hours_enabled,
    from: row?.quiet_from ?? DEFAULT_ALERT_DELIVERY.from,
    to: row?.quiet_to ?? DEFAULT_ALERT_DELIVERY.to,
    days: (row?.quiet_days as QuietDays | undefined) ?? DEFAULT_ALERT_DELIVERY.days,
    on_end: (row?.quiet_on_end as QuietOnEnd | undefined) ?? DEFAULT_ALERT_DELIVERY.on_end,
    allow_price_rise: row?.allow_price_rise ?? DEFAULT_ALERT_DELIVERY.allow_price_rise,
    rhythm: (row?.rhythm as AlertRhythm | undefined) ?? DEFAULT_ALERT_DELIVERY.rhythm,
    min_move: (row?.min_move as MinMove | undefined) ?? DEFAULT_ALERT_DELIVERY.min_move,
    // Display-only, and always the device zone. A stale stored value must not apply.
    timezone: detectTimezone(),
  };

  const update = useCallback(
    (patch: Partial<AlertDelivery>) => {
      const row: Record<string, unknown> = {};
      if (patch.quiet_hours_enabled !== undefined)
        row["quiet_hours_enabled"] = patch.quiet_hours_enabled;
      if (patch.from !== undefined) row["quiet_from"] = patch.from;
      if (patch.to !== undefined) row["quiet_to"] = patch.to;
      if (patch.days !== undefined) row["quiet_days"] = patch.days;
      if (patch.on_end !== undefined) row["quiet_on_end"] = patch.on_end;
      if (patch.allow_price_rise !== undefined) row["allow_price_rise"] = patch.allow_price_rise;
      if (patch.rhythm !== undefined) row["rhythm"] = patch.rhythm;
      if (patch.min_move !== undefined) row["min_move"] = patch.min_move;
      // The zone is never user-edited; it is recorded from the device on every
      // save so a future server-side sender has something to read.
      row["timezone"] = detectTimezone();
      save(row);
    },
    [save],
  );

  return { settings, ready, update };
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
 * is display-only and is always the device zone, even though
 * `notification_settings.timezone` is a real stored column.
 *
 * The timezone field becomes user-editable when — and ONLY when — the send path
 * reads the stored zone and evaluates this window in it. Making it editable
 * before then would accept a value that changes nothing: the field would look
 * like it moved the window while this function kept using the device clock.
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
