import { useEffect, useRef, useState } from "react";
import { Bookmark, Gem, ImageIcon, ShoppingBag, Watch } from "lucide-react";
import {
  SIGNAL_TYPE_LABELS,
  relativeTime,
  type SignalCategory,
  type SignalRow,
  type SignalType,
} from "@/lib/signals";
import type { PortfolioRow } from "@/lib/portfolio";
import type { WatchlistRow } from "@/lib/watchlist";

// Dot color per signal type + soft badge background.
const TYPE_STYLE: Record<SignalType, { dot: string; bg: string }> = {
  price_increase: { dot: "bg-amber-500", bg: "bg-amber-50" },
  new_collection: { dot: "bg-primary", bg: "bg-primary/10" },
  discount: { dot: "bg-emerald-500", bg: "bg-emerald-50" },
  drop: { dot: "bg-purple-500", bg: "bg-purple-50" },
};

const CATEGORY_ICON: Record<SignalCategory, React.ComponentType<{ className?: string }>> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
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

  const verb = precision === "brand" ? "may affect" : "affects";
  const parts: string[] = [];
  if (portfolioMatches.length > 0) {
    parts.push(
      `${portfolioMatches.length} portfolio ${pluralize(portfolioMatches.length, "piece")}`,
    );
  }
  if (watchlistMatches.length > 0) {
    parts.push(
      `${watchlistMatches.length} watchlist ${pluralize(watchlistMatches.length, "piece")}`,
    );
  }
  const detailLine = hasMatches ? `This ${verb} ${parts.join(" and ")}.` : null;

  const brandChipLabel = signal.model
    ? `${signal.brand_name.toUpperCase()} · ${signal.model.toUpperCase()}`
    : signal.brand_name.toUpperCase();

  const typeRef = useRef<HTMLSpanElement>(null);
  const actionRef = useRef<HTMLSpanElement>(null);
  const [isWrapped, setIsWrapped] = useState(false);

  useEffect(() => {
    const update = () => {
      if (typeRef.current && actionRef.current) {
        setIsWrapped(
          typeRef.current.getBoundingClientRect().top !==
            actionRef.current.getBoundingClientRect().top,
        );
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (typeRef.current) ro.observe(typeRef.current);
    if (actionRef.current) ro.observe(actionRef.current);
    return () => ro.disconnect();
  }, [signal.recommended_action]);

  return (
    <article className="rounded-2xl border border-hairline bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              ref={typeRef}
              className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 border border-hairline px-3 py-1 text-[11px] ${style.bg} ${isWrapped ? "rounded-xl" : "rounded-full"}`}
            >
              <span className="inline-flex items-center gap-2 shrink-0">
                <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
                <span className="font-display font-semibold uppercase tracking-widest text-foreground">
                  {SIGNAL_TYPE_LABELS[signal.type]}
                </span>
              </span>
              {signal.recommended_action ? (
                <span ref={actionRef} className="text-muted-foreground normal-case tracking-normal">
                  {signal.recommended_action}
                </span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-2.5 py-1 text-[11px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
              {(() => {
                const CategoryIcon = CATEGORY_ICON[signal.category];
                return <CategoryIcon className="h-3 w-3" aria-hidden="true" />;
              })()}
              <span className="truncate max-w-[18rem]">{brandChipLabel}</span>
            </span>
          </div>
          <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
            {relativeTime(signal.signal_date)}
          </span>
        </div>

        <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground">
          {signal.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{signal.body}</p>
      </div>

      {hasMatches ? (
        <div className="border-t border-hairline bg-[#FDFBF8] p-5">
          <p className="text-sm text-muted-foreground">{detailLine}</p>
          <div className="mt-3 flex flex-wrap gap-2">
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

        {row.photo_url ? (
          <img
            src={row.photo_url}
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
