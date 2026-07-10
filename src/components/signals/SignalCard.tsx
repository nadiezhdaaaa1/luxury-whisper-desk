import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Gem, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { relativeTime, SIGNAL_TYPE_LABELS, type SignalRow } from "@/lib/signals";
import { SIGNAL_TYPE_STYLE } from "@/lib/signal-type";


const TYPE_STYLE = SIGNAL_TYPE_STYLE;

export function SignalCard({ signal }: { signal: SignalRow }) {
  const navigate = useNavigate();
  const style = TYPE_STYLE[signal.type];
  const TypeIcon = style.icon;
  const CategoryIcon = signal.category === "watches" ? Watch : Gem;

  function handleViewPositions() {
    track("signal_view_positions_clicked", {
      brand_slug: signal.brand_slug,
      signal_id: signal.id,
      type: signal.type,
    });
    navigate({ to: "/app/watchlist" });
  }

  return (
    <article className="rounded-2xl border border-hairline bg-card p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 rounded-xl p-3 ring-1 ${style.bg} ${style.text} ${style.ring}`}
          aria-hidden="true"
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2 text-xs text-muted-foreground">
              <CategoryIcon className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground truncate">
                {signal.brand_name}
                {signal.model ? (
                  <span className="text-muted-foreground"> · {signal.model}</span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {signal.source_url && signal.source_url.startsWith("http") ? (
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open source"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {relativeTime(signal.signal_date)}
              </span>
            </div>
          </div>



          <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-foreground">
            {signal.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{signal.body}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${style.bg} ${style.text}`}
            >
              {SIGNAL_TYPE_LABELS[signal.type]}
              {signal.recommended_action ? (
                <span className="hidden sm:inline text-[11px] font-normal normal-case tracking-normal text-current/70">
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
