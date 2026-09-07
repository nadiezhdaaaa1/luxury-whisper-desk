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
    <article className="rounded-lg border border-hairline bg-card pt-[18px] pr-5 pb-[14px] pl-5 shadow-soft">
      {/* Row 1: accent bar spans the title + body only. */}
      <div className="flex w-full items-start gap-[14px]">
        <span
          className={`w-1 shrink-0 self-stretch rounded-[10px] ${style.dot}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-[12px]">
            <span
              className="inline-flex items-center text-muted-foreground"
              aria-label={categoryLabel}
            >
              <CategoryIcon className="h-[18px] w-[18px]" />
            </span>
            <h3 className="font-display text-[17px] font-medium leading-[22.44px] tracking-[-0.425px] text-foreground">
              {alert.title}
            </h3>
          </div>
          <p className="pl-[26px] pt-[3px] text-sm leading-[20.3px] text-muted-foreground">
            {alert.body}
          </p>
        </div>
      </div>

      {/* Row 2: meta, not indented by the accent bar. */}
      <div className="flex w-full items-center gap-[10px] pt-[10px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 font-display text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.08em] text-foreground">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
              aria-hidden="true"
            />
            {SIGNAL_TYPE_LABELS[alert.type]}
          </span>
          {alert.source_host ? (
            <span className="max-w-[192px] truncate text-[11px] leading-[16.5px] text-muted-foreground">
              via {alert.source_host}
            </span>
          ) : null}
          {alert.recommended_action ? (
            <span className="text-xs leading-4 text-muted-foreground">
              {alert.recommended_action}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
