// Sign-out reset for app-owned browser state.
//
// Fixes audit finding C1: local keys are global to the browser, not scoped to
// an account, so anything left behind at sign-out is inherited by the next
// person who signs in on that device.
//
// This list is the SINGLE source of truth. Both sign-out paths
// (`DashboardShell.tsx` and the settings page) call `clearLocalAccountState()`;
// do not inline a second copy of the list in either of them — two copies is how
// one goes stale.

import { CONSENT_STORAGE_KEY } from "@/lib/consent-storage";

/**
 * Keys cleared at sign-out.
 *
 * Included:
 * - consent record — a cookie decision is the previous person's, not the next
 *   one's. Cost of clearing it: a user who signs out and back in sees the
 *   cookie banner again. That is correct; the browser cannot know it is the
 *   same person, and re-asking is the safe failure.
 * - quiz drafts (current + legacy key) — nobody signs out mid-quiz, and a draft
 *   carrying the previous user's brand picks into a new signup is the same
 *   cross-account bleed in a different costume.
 * - the retired notification / mute localStorage keys (Phase 4b and 4c moved
 *   this state into the database). Nothing writes them any more; they are
 *   cleared so a copy left over from before those passes cannot linger on a
 *   shared browser.
 *
 * Deliberately NOT cleared: `sidebar_state` and `dashboard.insightsTab`. Pure
 * UI chrome with no cross-account meaning — clearing them is churn.
 */
export const LOCAL_KEYS_CLEARED_ON_SIGN_OUT: string[] = [
  CONSENT_STORAGE_KEY,
  "lux_quiz_draft_v3",
  "lux_quiz_draft",
  // Retired — superseded by `public.muted_alert_sources` / `public.notification_settings`.
  "lux.mutedAlertSources.v1",
  "lux.notifications.prefs.v1",
  "lux.alert.delivery.v1",
];

/** Removes every app-owned local key that carries cross-account meaning. */
export function clearLocalAccountState(): void {
  if (typeof window === "undefined") return;
  for (const key of LOCAL_KEYS_CLEARED_ON_SIGN_OUT) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). Sign-out
      // must never fail because a key could not be removed.
    }
  }
}
