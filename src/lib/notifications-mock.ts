// Frontend-only notifications & email mock.
// No backend; preferences persist in localStorage and "sent" emails log to
// console + toast so the flow is visible during design review.

import { toast } from "sonner";

const PREFS_KEY = "lux.notifications.prefs.v1";
const LOG_KEY = "lux.notifications.log.v1";

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
    description: "When a piece on your watchlist crosses your target price.",
  },
  weekly_digest: {
    label: "Weekly digest",
    description: "A Sunday summary of movement across your portfolio and watchlist.",
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
    window.dispatchEvent(new CustomEvent("notifications-mock-change"));
  } catch {
    // ignore quota errors in mock
  }
}

export function onPrefsChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("notifications-mock-change", handler);
  return () => window.removeEventListener("notifications-mock-change", handler);
}

// ---------- Mock email dispatch ----------

export type EmailTemplate =
  | "welcome"
  | "email_verification"
  | "magic_link"
  | "password_reset"
  | "password_changed"
  | "new_sign_in"
  | "price_alert"
  | "price_alert_below"
  | "weekly_digest"
  | "portfolio_paused"
  | "trial_ending"
  | "payment_failed"
  | "subscription_canceled"
  | "subscription_renewed"
  | "account_deletion_scheduled"
  | "account_deletion_canceled";

export type EmailPayload = {
  template: EmailTemplate;
  channel: NotificationChannel;
  to: string;
  data?: Record<string, unknown>;
};

export type EmailLogEntry = EmailPayload & { id: string; sent_at: string; skipped?: string };

export function sendMockEmail(payload: EmailPayload): EmailLogEntry {
  const prefs = getPrefs();
  const allowed = prefs[payload.channel];
  const entry: EmailLogEntry = {
    ...payload,
    id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sent_at: new Date().toISOString(),
    skipped: allowed ? undefined : "user_opted_out",
  };
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log: EmailLogEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 50)));
  } catch {
    // ignore
  }
  // eslint-disable-next-line no-console
  console.info("[mock-email]", entry);
  if (allowed) {
    toast.success(`Email sent · ${payload.template}`, { description: payload.to });
  }
  return entry;
}

export function getEmailLog(): EmailLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as EmailLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearEmailLog() {
  try {
    localStorage.removeItem(LOG_KEY);
    window.dispatchEvent(new CustomEvent("notifications-mock-change"));
  } catch {
    // ignore
  }
}
