// Email notification preferences.
//
// Forward-looking settings only: nothing in the app sends email off the back of
// these yet. They now persist in `public.notification_settings` (one row per
// user, owner-only RLS) so a future sender can actually read them, instead of
// living in a browser that only the current device can see.
//
// See `notification-settings.ts` for the shared row access, the lazy-create
// behaviour, and the deliberate non-migration of the old localStorage key
// `lux.notifications.prefs.v1`.

import { useCallback } from "react";
import {
  useNotificationSettings,
  useNotificationSettingsMutation,
} from "@/lib/notification-settings";

export type NotificationChannel =
  | "price_alerts"
  | "weekly_digest"
  | "plan_updates"
  | "product_news"
  | "security_alerts";

export type NotificationPrefs = Record<NotificationChannel, boolean>;

export const DEFAULT_PREFS: NotificationPrefs = {
  price_alerts: true,
  weekly_digest: true,
  plan_updates: true,
  product_news: false,
  security_alerts: true,
};

export const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; description: string; required?: boolean }
> = {
  price_alerts: {
    label: "Price alerts",
    description: "When a piece on your brand watchlist crosses your target price.",
  },
  weekly_digest: {
    label: "Weekly digest",
    description: "A Sunday summary of movement across your portfolio and brand watchlist.",
  },
  plan_updates: {
    label: "Plan & billing",
    description: "Renewals, receipts, cancellations, and grace-period reminders.",
    required: true,
  },
  product_news: {
    label: "Product news",
    description: "Occasional updates on new features. No marketing spam.",
  },
  security_alerts: {
    label: "Security alerts",
    description: "New sign-ins, password changes, and account-deletion notices.",
    required: true,
  },
};

/**
 * Channel preferences for the signed-in user.
 *
 * `ready` is false until the row (or its confirmed absence) has loaded; render
 * a placeholder rather than `DEFAULT_PREFS` while it is false, so a toggle
 * never visibly flips after hydration.
 */
export function useNotificationPrefs(): {
  prefs: NotificationPrefs;
  ready: boolean;
  setPref: (channel: NotificationChannel, value: boolean) => void;
} {
  const { row, ready } = useNotificationSettings();
  const { save } = useNotificationSettingsMutation();

  const prefs: NotificationPrefs = {
    price_alerts: row?.price_alerts ?? DEFAULT_PREFS.price_alerts,
    weekly_digest: row?.weekly_digest ?? DEFAULT_PREFS.weekly_digest,
    plan_updates: row?.plan_updates ?? DEFAULT_PREFS.plan_updates,
    product_news: row?.product_news ?? DEFAULT_PREFS.product_news,
    security_alerts: row?.security_alerts ?? DEFAULT_PREFS.security_alerts,
  };

  const setPref = useCallback(
    (channel: NotificationChannel, value: boolean) => {
      // Guard: required channels can never be switched off. Enforced here as
      // well as in the UI so no caller can route around the disabled control.
      if (CHANNEL_META[channel].required && !value) return;
      save({ [channel]: value });
    },
    [save],
  );

  return { prefs, ready, setPref };
}
