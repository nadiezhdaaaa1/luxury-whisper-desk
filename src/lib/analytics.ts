// Lightweight analytics facade with a consent gate baked into the vendor seam.
import { hasConsent } from "@/lib/consent-storage";

export type TrackEvent =
  | "sign_up"
  | "sign_in"
  | "log_out"
  | "portfolio_viewed"
  | "portfolio_item_added"
  | "portfolio_photo_recognized"
  | "portfolio_item_edited"
  | "portfolio_item_removed"
  | "portfolio_alert_set"
  | "portfolio_value_tab_switched"
  | "portfolio_free_limit_reached"
  | "signals_viewed"
  | "signal_filtered"
  | "signal_view_positions_clicked"
  | "dashboard_viewed"
  | "dashboard_value_tab_switched"
  | "dashboard_period_changed"
  | "dashboard_signal_card_clicked"
  | "important_signal_viewed"
  | "important_signal_view_clicked"
  | "dashboard_latest_signal_clicked"
  | "dashboard_card_tab_switched"
  | "dashboard_movers_row_clicked"
  | "upgrade_viewed"
  | "plan_selected"
  | "upgraded_to_pro"
  | "downgraded_to_free"
  | "blog_list_viewed"
  | "blog_post_viewed"
  | "blog_post_cta_clicked"
  | "contact_viewed"
  | "contact_submitted"
  | "contact_submit_failed"
  | "otp_code_sent"
  | "otp_verified"
  | "otp_verify_failed"
  | "watchlist_filter_changed"
  | "watchlist_filters_cleared"
  | "watchlist_remove_filtered_clicked"
  | "watchlist_remove_filtered_confirmed"
  | "watchlist_remove_filtered_canceled"
  | (string & {});

/* ------------------------------------------------------------------------ *
 * VENDOR SEAM — all third-party analytics/marketing calls go inside here.
 *
 * Rules (not optional):
 *  1. Never call a vendor SDK from `track()` or anywhere else in the app.
 *     The ONLY place vendor dispatch may live is inside the two functions
 *     below, after their consent check has passed.
 *  2. Analytics vendors (GA4, Amplitude, Clarity) go in
 *     `dispatchToAnalyticsVendors`. Marketing/attribution/pixels (Meta,
 *     Google Ads, AppsFlyer) go in `dispatchToMarketingVendors`. They are
 *     separate legal choices in the banner — never collapse them.
 *  3. Consent is read fresh on every call, so revoking mid-session stops
 *     tracking immediately. No caching the predicate at module scope.
 *  4. No stored record (first visit) or a record whose `version` doesn't
 *     match `CONSENT_VERSION` both deny. That is intended: fail closed.
 * ------------------------------------------------------------------------ */

function dispatchToAnalyticsVendors(name: string, props: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // Gate first, always. Add vendor calls BELOW this line only.
  if (!hasConsent("analytics")) return;

  void name;
  void props;
  // e.g. window.gtag?.("event", name, props);
  // e.g. window.amplitude?.track(name, props);
}

function dispatchToMarketingVendors(name: string, props: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // Gate first, always. Add vendor calls BELOW this line only.
  if (!hasConsent("marketing")) return;

  void name;
  void props;
  // e.g. window.fbq?.("trackCustom", name, props);
}

/**
 * Track a product event.
 *
 * The console.log is intentionally ungated — it never leaves the device and
 * local debugging must not depend on accepting analytics. Only vendor-bound
 * dispatch is gated, and it is gated inside the seam above.
 */
export function track(eventName: TrackEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${eventName}`, props);
  dispatchToAnalyticsVendors(eventName, props);
}

/** Marketing/attribution event (pixels, ad platforms). Gated on `marketing`. */
export function trackMarketing(eventName: TrackEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(`[marketing] ${eventName}`, props);
  dispatchToMarketingVendors(eventName, props);
}
