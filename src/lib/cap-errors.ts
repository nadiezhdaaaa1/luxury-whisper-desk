// Maps the Free-plan cap errors raised by the database triggers
// (enforce_portfolio_free_cap / enforce_watchlist_free_active_cap) to the same
// wording the client-side cap checks use.
//
// The client-side gates normally block first, so this only fires on a race or a
// stale plan read — but "try again" is guaranteed to be wrong in that case, so
// the user gets the real reason and the upgrade path instead.
//
// Raw Postgres text is never shown; we match on it and return our own copy.

const PORTFOLIO_CAP_MESSAGE = "Free plan is limited to";
const PORTFOLIO_MARKER = "portfolio items";
const WATCHLIST_MARKER = "brand watchlist items";

export const PORTFOLIO_CAP_TOAST =
  "You've hit your portfolio limit — upgrade to keep tracking more.";
export const WATCHLIST_CAP_TOAST =
  "You've hit your brand watchlist limit — upgrade to keep tracking more.";

function parts(e: unknown): { code: string; message: string } {
  const err = (e ?? {}) as { code?: unknown; message?: unknown };
  return {
    code: typeof err.code === "string" ? err.code : "",
    message: typeof err.message === "string" ? err.message : "",
  };
}

/**
 * Returns the user-facing cap message when `e` is one of our cap-trigger
 * errors, or null for anything else (so callers keep their generic message).
 * Matches on code AND message so an unrelated future P0001 isn't mislabelled.
 */
export function capErrorMessage(e: unknown): string | null {
  const { code, message } = parts(e);
  if (code !== "P0001" || !message.includes(PORTFOLIO_CAP_MESSAGE)) return null;
  if (message.includes(PORTFOLIO_MARKER)) return PORTFOLIO_CAP_TOAST;
  if (message.includes(WATCHLIST_MARKER)) return WATCHLIST_CAP_TOAST;
  return null;
}

export function isCapError(e: unknown): boolean {
  return capErrorMessage(e) !== null;
}
