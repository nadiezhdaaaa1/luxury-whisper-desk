import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics";

type Props = {
  used: number;
  cap: number;
  itemLabel: string; // e.g. "portfolio items" or "watchlist items"
  from: string; // analytics source
};

/**
 * Shown to Free users approaching (but not yet at) their plan cap.
 * Rule of thumb: display when used >= cap - 1 (last slot left) OR
 * used / cap >= 0.8. Hidden entirely at cap (that's a different, harder
 * upsell handled by the "limit reached" screen).
 */
export function ApproachingLimitBanner({ used, cap, itemLabel, from }: Props) {
  if (cap <= 0) return null;
  if (used >= cap) return null;
  const remaining = cap - used;
  const showAtN = Math.max(1, Math.ceil(cap * 0.2)); // last 20% of slots
  if (remaining > showAtN) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3">
      <div className="flex items-start gap-2.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
        <span className="text-foreground">
          You have{" "}
          <span className="font-display font-semibold text-alert">
            {remaining} {itemLabel.replace(/ items?$/, "")} slot{remaining === 1 ? "" : "s"}
          </span>{" "}
          left on the Free plan ({used}/{cap}).
        </span>
      </div>
      <Link
        to="/app/settings"
        onClick={() => track("upgrade_click", { from: `approaching_${from}` })}
        className="inline-flex items-center rounded-full border border-alert/40 bg-white px-3 py-1.5 text-xs font-display font-semibold uppercase tracking-widest text-alert hover:bg-alert/5"
      >
        See Pro plans
      </Link>
    </div>
  );
}
