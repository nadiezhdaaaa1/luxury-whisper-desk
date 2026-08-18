
import { BellOff, Bookmark, ExternalLink, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { track } from "@/lib/analytics";
import { muteSource, sourceHostname, unmuteSource } from "@/lib/muted-sources";
import {
  SIGNAL_TYPE_LABELS,
  type SignalRow,
  type SignalType,
} from "@/lib/signals";
import { SIGNAL_CATEGORY_ICON, SIGNAL_CATEGORY_LABEL } from "@/lib/signal-type";
import type { PortfolioRow } from "@/lib/portfolio";
import type { WatchlistRow } from "@/lib/watchlist";

// Dot color per signal type.
const TYPE_STYLE: Record<SignalType, { dot: string }> = {
  price_increase: { dot: "bg-amber-500" },
  new_collection: { dot: "bg-primary" },
  discount: { dot: "bg-emerald-500" },
  drop: { dot: "bg-purple-500" },
};

function pluralize(n: number, singular: string, plural = singular + "s"): string {
  return n === 1 ? singular : plural;
}

export type SignalCardData = {
  signal: SignalRow;
  portfolioMatches: PortfolioRow[];
  watchlistMatches: WatchlistRow[];
  precision: "brand" | "piece";
};

export function ImportantSignalCard({ item }: { item: SignalCardData }) {
  const { signal, portfolioMatches, watchlistMatches, precision } = item;
  const style = TYPE_STYLE[signal.type];
  const hasMatches = portfolioMatches.length > 0 || watchlistMatches.length > 0;
  const host = sourceHostname(signal.source_url);

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

  const verb = precision === "brand" ? "may affect" : "affects";
  const parts: string[] = [];
  if (portfolioMatches.length > 0) {
    parts.push(
      `${portfolioMatches.length} portfolio ${pluralize(portfolioMatches.length, "piece")}`,
    );
  }
  if (watchlistMatches.length > 0) {
    parts.push(
      `${watchlistMatches.length} brand watchlist ${pluralize(watchlistMatches.length, "item")}`,
    );
  }
  const detailLine = hasMatches ? `This ${verb} ${parts.join(" and ")}.` : null;

  const CategoryIcon = SIGNAL_CATEGORY_ICON[signal.category];
  const categoryLabel = SIGNAL_CATEGORY_LABEL[signal.category];

  return (
    <article className="group relative rounded-xl border border-hairline bg-card overflow-hidden transition-colors hover:bg-surface/50">
      {signal.source_url && signal.source_url.startsWith("http") ? (
        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open source: ${signal.title}`}
          className="absolute inset-0 z-0"
        />
      ) : null}
      <div className="p-4 pr-12">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center text-muted-foreground" aria-label={categoryLabel}>
            <CategoryIcon className="h-3.5 w-3.5" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-display font-semibold uppercase tracking-wider text-foreground">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
            {SIGNAL_TYPE_LABELS[signal.type]}
          </span>
          {host ? (
            <span className="text-[11px] text-muted-foreground truncate max-w-[10rem]">via {host}</span>
          ) : null}
          {signal.recommended_action ? (
            <span className="text-xs text-muted-foreground">{signal.recommended_action}</span>
          ) : null}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {signal.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{signal.body}</p>
        </div>
      </div>

      {signal.source_url && signal.source_url.startsWith("http") ? (
        <span
          className="pointer-events-none absolute right-4 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      ) : null}

      {host ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleMute}
                aria-label={`Mute alerts from ${host}`}
                className="absolute right-4 bottom-3 z-10 grid h-7 w-7 place-items-center rounded-full text-muted-foreground/60 opacity-100 transition-all hover:bg-surface-2 hover:text-foreground focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <BellOff className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Mute alerts from {host}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}


      {hasMatches ? (
        <div className="border-t border-hairline bg-surface p-4">
          <p className="text-xs text-muted-foreground">{detailLine}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {portfolioMatches.map((p) => (
              <PortfolioThumb key={`p-${p.id}`} row={p} />
            ))}
            {watchlistMatches.map((w) => (
              <WatchlistChip key={`w-${w.id}`} row={w} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
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
