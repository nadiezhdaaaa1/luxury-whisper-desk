// Email notification preferences.
//
// Forward-looking settings only: nothing in the app sends email off the back of
// these yet. They persist in localStorage today; a later phase moves them
// server-side so a sender can actually read them.

const PREFS_KEY = "lux.notifications.prefs.v1";

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

const CHANGE_EVENT = "notification-prefs-change";

export function getPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setPref(channel: NotificationChannel, value: boolean) {
  const meta = CHANNEL_META[channel];
  if (meta.required && !value) return; // guard: never disable required channels
  const next = { ...getPrefs(), [channel]: value };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore quota errors
  }
}

export function onPrefsChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
