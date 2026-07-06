// Lightweight analytics stub. Later prompts wire vendors (GA4, Amplitude, etc).
export type TrackEvent =
  | "sign_up"
  | "sign_in"
  | "log_out"
  | (string & {});

export function track(eventName: TrackEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${eventName}`, props);
}
