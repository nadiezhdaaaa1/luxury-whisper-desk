import { MoreVertical, ImageIcon, ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { portfolioPhotoSrc, type PortfolioRow } from "@/lib/portfolio";
import { getMockMarketPrice } from "@/lib/demo-market-prices";
import type { Tier } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = {
  row: PortfolioRow;
  tier?: Tier | null;
  onEdit: () => void;
  onRemove: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

const TIER_BADGE: Record<Tier, string> = {
  luxury_invest: "LUXURY",
  mid_market: "MID-MARKET",
  mass_market: "MASS-MARKET",
};

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PortfolioCard({
  row,
  tier,
  onEdit,
  onRemove,
  selectable,
  selected,
  onToggleSelect,
}: Props) {
  // DEMO ONLY — all market values below come from the isolated demo module.
  const mp = getMockMarketPrice(row.id, row.purchase_price);
  const purchase = row.purchase_price != null ? Number(row.purchase_price) : null;
  const pct =
    purchase != null && purchase > 0 && mp != null
      ? ((mp.current - purchase) / purchase) * 100
      : null;

  const alertLow =
    row.alert_below_enabled && row.alert_below_price != null ? Number(row.alert_below_price) : null;
  const alertHigh =
    row.alert_above_enabled && row.alert_above_price != null ? Number(row.alert_above_price) : null;

  const badge = TIER_BADGE[tier ?? "luxury_invest"];

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg border border-hairline bg-card shadow-[var(--shadow-card)]",
        selectable
          ? "cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-[var(--card-border-hover)] hover:shadow-soft"
          : "",
        selected ? "ring-2 ring-primary shadow-soft" : "",
      )}
      onClick={
        selectable
          ? (e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }
          : undefined
      }
      role={selectable ? "button" : undefined}
      aria-pressed={selectable ? !!selected : undefined}
    >
      {selectable ? (
        <div
          className={cn(
            "absolute top-2 left-2 z-10 h-6 w-6 rounded-full grid place-items-center border-2 transition-colors",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-background/85 border-hairline text-transparent",
          )}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div className="relative aspect-[4/3] w-full bg-surface-2">
        {portfolioPhotoSrc(row) ? (
          <img
            src={portfolioPhotoSrc(row)!}
            alt={`${row.brand}${row.model ? " " + row.model : ""}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}

        {!selectable ? (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 border border-hairline px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            {badge}
          </div>
        ) : null}

        {!selectable ? (
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/85 hover:bg-background"
                  aria-label="Item actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="font-display font-semibold text-base leading-tight text-foreground">
            {row.brand}
          </div>
          {row.model ? <div className="text-sm text-muted-foreground">{row.model}</div> : null}
        </div>

        <div className="flex flex-col gap-3">
          {purchase != null ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Purchase price</span>
              <span className="font-semibold text-foreground">{fmtUSD(purchase)}</span>
              {pct != null ? (
                <span
                  className={
                    "ml-auto inline-flex items-center gap-0.5 font-semibold " +
                    (pct >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--alert)]")
                  }
                >
                  {pct >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {(pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"}
                </span>
              ) : null}
            </div>
          ) : null}

          {alertLow != null && alertHigh == null ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Alert when price below</span>
              <span className="font-semibold text-[color:var(--alert)]">{fmtUSD(alertLow)}</span>
            </div>
          ) : null}

          {alertHigh != null && alertLow == null ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Alert when price above</span>
              <span className="font-semibold text-[color:var(--positive)]">
                {fmtUSD(alertHigh)}
              </span>
            </div>
          ) : null}

          {mp != null ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Market price</span>
              <span className="font-semibold text-foreground text-lg">{fmtUSD(mp.current)}</span>
            </div>
          ) : null}

          {row.target_price != null
            ? (() => {
                const target = Number(row.target_price);
                const toGo = mp != null ? ((target - mp.current) / target) * 100 : null;
                const reached = mp != null && mp.current >= target;
                return (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Target sell price</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{fmtUSD(target)}</span>
                      {toGo != null ? (
                        <span
                          className={
                            "font-semibold " +
                            (reached ? "text-[color:var(--positive)]" : "text-muted-foreground")
                          }
                        >
                          {reached ? "reached" : `${toGo.toFixed(1)}% to go`}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })()
            : null}
        </div>
      </div>
    </article>
  );
}
