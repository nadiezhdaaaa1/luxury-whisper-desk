/**
 * React-free consent storage layer.
 *
 * This module is deliberately free of React (and of any other import) so that
 * plain modules like `src/lib/analytics.ts` can read consent without pulling
 * the consent React context into their import graph — and without creating an
 * `analytics -> consent -> analytics` cycle.
 *
 * `src/lib/consent.tsx` (the provider/UI layer) is the only writer.
 * Do NOT rename STORAGE_KEY or change CONSENT_VERSION here without a matching
 * migration — an unknown version intentionally invalidates the stored record.
 */

export type ConsentCategory = "necessary" | "functional" | "analytics" | "marketing";

export type ConsentPrefs = Record<ConsentCategory, boolean>;

export interface ConsentRecord {
  prefs: ConsentPrefs;
  timestamp: number;
  version: string;
}

export const CONSENT_VERSION = "2026-07-06";
export const CONSENT_STORAGE_KEY = "luxtracker.consent.v1";

export const DEFAULT_CONSENT_PREFS: ConsentPrefs = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/** Returns the stored consent record, or null when absent/invalid/stale. */
export function loadConsentRecord(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.prefs || typeof parsed.prefs !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsentRecord(prefs: ConsentPrefs) {
  if (typeof window === "undefined") return;
  const record: ConsentRecord = { prefs, timestamp: Date.now(), version: CONSENT_VERSION };
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}

/**
 * Fail-closed consent predicate. Reads storage fresh on every call so a
 * mid-session revocation takes effect immediately (no reload required).
 *
 * Denies when: SSR (no window), no stored record, stored version !==
 * CONSENT_VERSION, malformed JSON, or the category is not explicitly true.
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const record = loadConsentRecord();
  if (!record) return false;
  return record.prefs[category] === true;
}
