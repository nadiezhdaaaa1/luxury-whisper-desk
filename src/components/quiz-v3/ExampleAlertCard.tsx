// Read-only example alert card for the public post-quiz reveal.
//
// Deliberately NOT src/components/signals/SignalCard.tsx: that card navigates
// to /app/watchlist, renders a "View positions" button and wires a mute
// control — all meaningless for an anonymous visitor. Nothing here is
// clickable, and no date is rendered (the sample rows are weeks old and dated
// cards would read as a stale live feed).
import type { ExampleAlert } from "@/lib/aha-signals.functions";
import { SIGNAL_TYPE_LABELS } from "@/lib/signals";
import { SIGNAL_CATEGORY_ICON, SIGNAL_CATEGORY_LABEL, SIGNAL_TYPE_STYLE } from "@/lib/signal-type";

export function ExampleAlertCard({ alert }: { alert: ExampleAlert }) {
  const style = SIGNAL_TYPE_STYLE[alert.type];
  const CategoryIcon = SIGNAL_CATEGORY_ICON[alert.category];
  const categoryLabel = SIGNAL_CATEGORY_LABEL[alert.category];

  return (
    <article className="flex gap-3 rounded-xl border border-hairline bg-card p-4 shadow-soft">
      <span className={`w-1 shrink-0 self-stretch rounded-full ${style.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center text-muted-foreground"
            aria-label={categoryLabel}
          >
            <CategoryIcon className="h-3.5 w-3.5" />
          </span>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {alert.title}
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.body}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
              aria-hidden="true"
            />
            {SIGNAL_TYPE_LABELS[alert.type]}
          </span>
          {alert.source_host ? (
            <span className="max-w-[10rem] truncate text-[11px] text-muted-foreground">
              via {alert.source_host}
            </span>
          ) : null}
          {alert.recommended_action ? (
            <span className="text-xs text-muted-foreground">{alert.recommended_action}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
