// Lightweight analytics stub. Later prompts wire vendors (GA4, Amplitude, etc).
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
  | "portfolio_free_limit_reached"
  | "signals_viewed"
  | "signal_filtered"
  | "signal_view_positions_clicked"
  | "dashboard_viewed"
  | "dashboard_value_tab_switched"
  | "important_signal_viewed"
  | "important_signal_view_clicked"
  | "dashboard_latest_signal_clicked"
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

export function track(eventName: TrackEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${eventName}`, props);
}
