import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { relativeTime, SIGNAL_TYPE_LABELS, type SignalRow } from "@/lib/signals";
import { SIGNAL_TYPE_STYLE } from "@/lib/signal-type";


const TYPE_STYLE = SIGNAL_TYPE_STYLE;

export function SignalCard({ signal }: { signal: SignalRow }) {
  const navigate = useNavigate();
  const style = TYPE_STYLE[signal.type];
  const TypeIcon = style.icon;

  function handleViewPositions() {
    track("signal_view_positions_clicked", {
      brand_slug: signal.brand_slug,
      signal_id: signal.id,
      type: signal.type,
    });
    navigate({ to: "/app/watchlist" });
  }

  return (
    <article className="rounded-xl border border-hairline bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 rounded-xl border border-hairline bg-surface p-2.5 text-muted-foreground"
          aria-hidden="true"
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground truncate">
                {signal.brand_name}
                {signal.model ? (
                  <span className="text-muted-foreground"> · {signal.model}</span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {signal.source_url && signal.source_url.startsWith("http") ? (
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open source"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
              <span className="text-[11px] text-muted-foreground">
                {relativeTime(signal.signal_date)}
              </span>
            </div>
          </div>

          <h3 className="mt-1.5 font-display text-base font-semibold tracking-tight text-foreground">
            {signal.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{signal.body}</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
              {SIGNAL_TYPE_LABELS[signal.type]}
              {signal.recommended_action ? (
                <span className="hidden sm:inline text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                  · {signal.recommended_action}
                </span>
              ) : null}
            </span>
            <Button variant="ghost" size="sm" onClick={handleViewPositions}>
              View positions
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
