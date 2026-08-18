// Frontend-only mock layer for subscription lifecycle states that don't yet
// exist on the backend: scheduled cancellations, pauses, churn reasons, and
// save-offer acceptance. Real Stripe integration will replace this file
// entirely — every read path uses `getSubscriptionMockState()` so swapping
// the source is a one-file change.
//
// State is keyed per user in localStorage so it survives reloads without any
// server round-trip. All mutations dispatch a `subscription-mock:changed`
// event so React consumers can refetch.

export type CancelReason =
  | "too_expensive"
  | "not_using"
  | "missing_features"
  | "found_alternative"
  | "temporary_break"
  | "other";

export const CANCEL_REASONS: { id: CancelReason; label: string }[] = [
  { id: "too_expensive", label: "It's too expensive" },
  { id: "not_using", label: "I'm not using it enough" },
  { id: "missing_features", label: "Missing features I need" },
  { id: "found_alternative", label: "Found a better alternative" },
  { id: "temporary_break", label: "Just taking a break" },
  { id: "other", label: "Other" },
];

export type SubscriptionMockStatus = "active" | "cancel_scheduled";

export type SubscriptionMockState = {
  status: SubscriptionMockStatus;
  // ISO datetime — end of the current paid period when cancellation is scheduled.
  endsAt?: string;
  // Recorded when the user schedules a cancel.
  cancelReason?: CancelReason;
  cancelNote?: string;
  cancelledAt?: string;
  // Recorded when the user accepts the retention offer.
  saveOfferAcceptedAt?: string;
  saveOfferDiscountPct?: number;
};

const EVENT = "subscription-mock:changed";

function storageKey(userId: string): string {
  return `subMock:${userId}`;
}

function readRaw(userId: string): SubscriptionMockState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as SubscriptionMockState;
  } catch {
    return null;
  }
}

function writeRaw(userId: string, state: SubscriptionMockState | null): void {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  if (state === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

/** Read current mock lifecycle state. Returns `active` when nothing stored. */
export function getSubscriptionMockState(userId: string | undefined): SubscriptionMockState {
  if (!userId) return { status: "active" };
  const s = readRaw(userId);
  if (!s) return { status: "active" };
  // Cancellation elapsed — the profile.plan flip is handled elsewhere; here
  // we just clear the schedule so the UI stops showing "ends on…".
  if (s.status === "cancel_scheduled" && s.endsAt && new Date(s.endsAt) <= new Date()) {
    writeRaw(userId, null);
    return { status: "active" };
  }
  return s;
}

export type SchedulePeriod = "monthly" | "annual";

/**
 * End of the current paid period. Real billing data will replace this; until
 * then it is derived deterministically per user+period so the date shown
 * before cancelling matches the date recorded when cancelling.
 */
export function currentPeriodEnd(userId: string, period: SchedulePeriod): string {
  const existing = readRaw(userId);
  if (existing?.endsAt) return existing.endsAt;
  const end = new Date();
  end.setDate(end.getDate() + (period === "annual" ? 60 : 14));
  return end.toISOString();
}

/** Locale-aware long date, e.g. "18 September 2026". */
export function formatPeriodEnd(iso: string | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Locale-aware short date, e.g. "18 Sep". */
export function formatShortDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(iso));
}

/** Schedule cancellation at the end of the current paid period. */
export function scheduleCancel(
  userId: string,
  period: SchedulePeriod,
  reason?: CancelReason,
  note?: string,
): SubscriptionMockState {
  const now = new Date();
  const next: SubscriptionMockState = {
    status: "cancel_scheduled",
    endsAt: currentPeriodEnd(userId, period),
    cancelReason: reason,
    cancelNote: note,
    cancelledAt: now.toISOString(),
  };
  writeRaw(userId, next);
  return next;
}

/** Undo a scheduled cancellation before the end date. */
export function reactivateSubscription(userId: string): void {
  writeRaw(userId, null);
}

/** Accept the retention save-offer — clears any scheduled cancel. */
export function acceptSaveOffer(userId: string, discountPct: number): SubscriptionMockState {
  const next: SubscriptionMockState = {
    status: "active",
    saveOfferAcceptedAt: new Date().toISOString(),
    saveOfferDiscountPct: discountPct,
  };
  writeRaw(userId, next);
  return next;
}

/** Clear all mock state (used when the plan changes via other paths). */
export function clearSubscriptionMock(userId: string): void {
  writeRaw(userId, null);
}

/** Subscribe to state changes. Returns an unsubscribe fn. */
export function onSubscriptionMockChange(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Human-readable formatter for the "ends on …" copy. */
export function formatEndDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Days remaining until an ISO date, floored at 0. */
export function daysUntil(iso: string | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
