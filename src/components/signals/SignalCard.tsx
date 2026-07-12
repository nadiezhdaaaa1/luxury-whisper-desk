import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { SIGNAL_TYPE_LABELS, type SignalRow } from "@/lib/signals";
import { SIGNAL_CATEGORY_ICON, SIGNAL_CATEGORY_LABEL, SIGNAL_TYPE_STYLE } from "@/lib/signal-type";


const TYPE_STYLE = SIGNAL_TYPE_STYLE;

export function SignalCard({ signal }: { signal: SignalRow }) {
  const navigate = useNavigate();
  const style = TYPE_STYLE[signal.type];
  const CategoryIcon = SIGNAL_CATEGORY_ICON[signal.category];
  const categoryLabel = SIGNAL_CATEGORY_LABEL[signal.category];

  function handleViewPositions() {
    track("signal_view_positions_clicked", {
      brand_slug: signal.brand_slug,
      signal_id: signal.id,
      type: signal.type,
    });
    navigate({ to: "/app/watchlist" });
  }

  return (
    <article className="relative rounded-xl border border-hairline bg-card p-4 pr-12 shadow-soft">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 rounded-xl border border-hairline bg-surface p-2.5 text-muted-foreground"
          aria-label={categoryLabel}
        >
          <CategoryIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
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

      {signal.source_url && signal.source_url.startsWith("http") ? (
        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open source"
          className="absolute right-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}
