import { ArrowUpRight, BellOff, Bookmark, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { track } from "@/lib/analytics";
import { sourceHostname, useMutedSourceActions } from "@/lib/muted-sources";
import { SIGNAL_TYPE_LABELS, type SignalRow } from "@/lib/signals";
import { SIGNAL_CATEGORY_ICON, SIGNAL_CATEGORY_LABEL, SIGNAL_TYPE_STYLE } from "@/lib/signal-type";
import { portfolioPhotoSrc, type PortfolioRow } from "@/lib/portfolio";
import type { WatchlistRow } from "@/lib/watchlist";

export type SignalCardData = {
  signal: SignalRow;
  portfolioMatches: PortfolioRow[];
  watchlistMatches: WatchlistRow[];
  precision: "brand" | "piece";
};

export function ImportantSignalCard({ item }: { item: SignalCardData }) {
  const { signal, portfolioMatches, watchlistMatches, precision } = item;
  const style = SIGNAL_TYPE_STYLE[signal.type];
  const hasMatches = portfolioMatches.length > 0 || watchlistMatches.length > 0;
  const host = sourceHostname(signal.source_url);
  const { muteSource, unmuteSource } = useMutedSourceActions();

  function handleMute(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!host) return;
    muteSource(host);
    track("signal_source_muted", { host, signal_id: signal.id });
    toast.success(`Muted alerts from ${host}`, {
      description: "You'll still get alerts on this brand from other sources.",
      action: {
        label: "Undo",
        onClick: () => {
          unmuteSource(host);
          track("signal_source_unmuted", { host, via: "undo" });
        },
      },
    });
  }

  const CategoryIcon = SIGNAL_CATEGORY_ICON[signal.category];
  const categoryLabel = SIGNAL_CATEGORY_LABEL[signal.category];
  const isLink = !!signal.source_url && signal.source_url.startsWith("http");

  return (
    <TooltipProvider delayDuration={200}>
      <article className="group relative overflow-hidden rounded-lg border border-hairline bg-card shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--card-border-hover)] hover:shadow-soft">
        {isLink ? (
          <a
            href={signal.source_url!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open source: ${signal.title}`}
            className="absolute inset-0 z-0"
          />
        ) : null}

        <div className="pointer-events-none relative z-[1] px-5 pt-[18px] pb-[14px]">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className={`w-1 shrink-0 self-stretch rounded-sm ${style.dot}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <span
                  role="img"
                  aria-label={categoryLabel}
                  className="mt-0.5 -mr-1 inline-flex shrink-0 items-center text-muted-foreground"
                >
                  <CategoryIcon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="min-w-0 flex-1 font-display text-[17px] leading-[1.32] tracking-tight text-foreground">
                  {signal.title}
                </h3>
                {isLink ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={signal.source_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hairline bg-card text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Open {host}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <p className="ml-[26px] mt-[3px] max-w-[60ch] text-sm leading-[1.45] text-muted-foreground">
                {signal.body}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-hairline bg-surface px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                <span
                  aria-hidden="true"
                  className={`block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                />
                {SIGNAL_TYPE_LABELS[signal.type]}
              </span>
              {host ? (
                <span className="max-w-[12rem] truncate text-[11px] text-muted-foreground">
                  via {host}
                </span>
              ) : null}
              {signal.recommended_action ? (
                <span className="text-xs text-muted-foreground">{signal.recommended_action}</span>
              ) : null}
            </div>
            {host ? (
              <div className="pointer-events-auto shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleMute}
                      aria-label={`Mute alerts from ${host}`}
                      /* after:* is a hit-area guard: the press-shrink pulls the
                         edges away from the cursor, so an edge press released
                         outside the button and never fired a click. */
                      className="relative grid h-11 w-11 place-items-center rounded-full text-muted-foreground opacity-100 transition-[background-color,color,opacity,transform] duration-150 hover:bg-surface-2 hover:text-foreground active:scale-95 after:content-[''] after:absolute after:-inset-1 after:rounded-[inherit] focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-ring)] lg:h-9 lg:w-9 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <BellOff className="h-[17px] w-[17px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Mute alerts from {host}</TooltipContent>
                </Tooltip>
              </div>
            ) : null}
          </div>
        </div>

        {hasMatches ? (
          <div className="pointer-events-none relative z-[1] flex flex-wrap items-center gap-2 px-5 py-[18px] before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-hairline">
            <span className="mr-0.5 text-xs text-muted-foreground">
              {precision === "brand" ? "May affect" : "Affects"}
            </span>
            {portfolioMatches.map((p) => (
              <PortfolioThumb key={`p-${p.id}`} row={p} />
            ))}
            {watchlistMatches.map((w) => (
              <WatchlistChip key={`w-${w.id}`} row={w} />
            ))}
          </div>
        ) : null}
      </article>
    </TooltipProvider>
  );
}

function PortfolioThumb({ row }: { row: PortfolioRow }) {
  const label = row.model ? `${row.brand} ${row.model}` : row.brand;
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-hairline bg-white pr-3 overflow-hidden"
      title={label}
    >
      <div className="h-9 w-9 shrink-0 bg-champagne-soft/60">
        {portfolioPhotoSrc(row) ? (
          <img
            src={portfolioPhotoSrc(row)!}
            alt={label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-4 w-4 opacity-50" />
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-[14rem]">
        <div className="text-xs font-medium truncate text-foreground">
          <span className="font-semibold">{row.brand}</span>
          {row.model ? <span className="text-muted-foreground"> {row.model}</span> : null}
        </div>
      </div>
    </div>
  );
}

function WatchlistChip({ row }: { row: WatchlistRow }) {
  const isPiece = row.type === "piece" && !!row.model;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-2 text-xs text-foreground"
      title={isPiece ? `${row.brand} ${row.model}` : row.brand}
    >
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="font-semibold">{row.brand}</span>
      {isPiece ? <span className="text-muted-foreground">{row.model}</span> : null}
    </span>
  );
}
