import { MoreVertical, ImageIcon, Lock, ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortfolioRow } from "@/lib/portfolio";
import { getMockMarketPrice } from "@/lib/demo-market-prices";
import type { Tier } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = {
  row: PortfolioRow;
  tier?: Tier | null;
  readOnly?: boolean;
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

export function PortfolioCard({ row, tier, readOnly, onEdit, onRemove }: Props) {
  // DEMO ONLY — all market values below come from the isolated demo module.
  // Paused (read-only / over-cap Free) items do not display tracking data.
  const mp = !readOnly ? getMockMarketPrice(row.id, row.purchase_price) : null;
  const purchase = row.purchase_price != null ? Number(row.purchase_price) : null;
  const pct =
    !readOnly && purchase != null && purchase > 0 && mp != null
      ? ((mp.current - purchase) / purchase) * 100
      : null;

  const alertLow =
    row.alert_below_enabled && row.alert_below_price != null
      ? Number(row.alert_below_price)
      : null;
  const alertHigh =
    row.alert_above_enabled && row.alert_above_price != null
      ? Number(row.alert_above_price)
      : null;

  const markerPct =
    mp != null && alertLow != null && alertHigh != null && alertHigh > alertLow
      ? Math.max(
          0,
          Math.min(100, ((mp.current - alertLow) / (alertHigh - alertLow)) * 100),
        )
      : 0;

  const badge = TIER_BADGE[tier ?? "luxury_invest"];
  const isPaused = readOnly;

  return (
    <article className={`card-flat overflow-hidden flex flex-col ${isPaused ? "opacity-80" : ""}`}>
      <div className="relative aspect-[4/3] w-full bg-surface-2">
        {row.photo_url ? (
          <img
            src={row.photo_url}
            alt={`${row.brand}${row.model ? " " + row.model : ""}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}

        {!isPaused ? (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 border border-hairline px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            {readOnly ? <Lock className="h-3 w-3" /> : null}
            {badge}
          </div>
        ) : null}

        <div className="absolute top-2 right-2">
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
              <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <div className="font-display font-semibold text-base leading-tight text-foreground">
            {row.brand}
          </div>
          {row.model ? (
            <div className="text-sm text-muted-foreground">{row.model}</div>
          ) : null}
        </div>

        {purchase != null ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Purchase price</span>
            <span className="font-semibold text-foreground">{fmtUSD(purchase)}</span>
            {pct != null ? (
              <span
                className={
                  "ml-auto inline-flex items-center gap-0.5 font-semibold " +
                  (pct >= 0
                    ? "text-[color:var(--positive)]"
                    : "text-[color:var(--alert)]")
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

        {!isPaused && alertLow != null && alertHigh != null ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[color:var(--alert)] shrink-0">
              {fmtUSD(alertLow)}
            </span>
            <div
              className="relative flex-1 h-1 rounded-full overflow-visible"
              style={{
                background:
                  "linear-gradient(to right, var(--alert), color-mix(in oklab, var(--alert) 50%, var(--positive) 50%), var(--positive))",
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-primary border-[3px] border-white"
                style={{ left: `${markerPct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs font-semibold text-[color:var(--positive)] shrink-0">
              {fmtUSD(alertHigh)}
            </span>
          </div>
        ) : null}

        {!isPaused && alertLow != null && alertHigh == null ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Alert when price below</span>
            <span className="font-semibold text-[color:var(--alert)]">{fmtUSD(alertLow)}</span>
          </div>
        ) : null}

        {!isPaused && alertHigh != null && alertLow == null ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Alert when price above</span>
            <span className="font-semibold text-[color:var(--positive)]">{fmtUSD(alertHigh)}</span>
          </div>
        ) : null}

        {!isPaused && mp != null ? (
          <div className="flex items-center justify-between text-xs pt-1 mt-auto">
            <span className="text-muted-foreground">Market price</span>
            <span className="font-semibold text-foreground text-lg">{fmtUSD(mp.current)}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
