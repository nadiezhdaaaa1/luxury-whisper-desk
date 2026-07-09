import { MoreVertical, ImageIcon, Lock, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortfolioRow } from "@/lib/portfolio";
import { getMockMarketPrice } from "@/lib/demo-market-prices";
import type { Tier } from "@/lib/catalog";

type Props = {
  row: PortfolioRow;
  tier?: Tier | null;
  readOnly?: boolean;
  onEdit: () => void;
  onRemove: () => void;
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
  const mp = getMockMarketPrice(row.id, row.purchase_price);
  const purchase = row.purchase_price != null ? Number(row.purchase_price) : null;
  const pct = purchase != null && purchase > 0 ? ((mp.current - purchase) / purchase) * 100 : null;

  const markerPct = Math.max(
    0,
    Math.min(100, ((mp.current - mp.low) / Math.max(1, mp.high - mp.low)) * 100),
  );

  const badge = TIER_BADGE[tier ?? "luxury_invest"];

  return (
    <article className="card-flat overflow-hidden flex flex-col">
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

        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 border border-hairline px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {readOnly ? <Lock className="h-3 w-3" /> : null}
          {badge}
        </div>

        {!readOnly ? (
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
        ) : null}
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

        {/* Range bar — DEMO */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-[color:var(--alert)]">{fmtUSD(mp.low)}</span>
            <span className="text-[color:var(--positive)]">{fmtUSD(mp.high)}</span>
          </div>
          <div
            className="relative h-1.5 rounded-full overflow-visible"
            style={{
              background:
                "linear-gradient(to right, var(--alert), color-mix(in oklab, var(--alert) 50%, var(--positive) 50%), var(--positive))",
            }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-background border-2 border-foreground shadow-sm"
              style={{ left: `${markerPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 mt-auto">
          <span className="text-muted-foreground">Market price</span>
          <span className="font-semibold text-foreground text-lg">{fmtUSD(mp.current)}</span>
        </div>
      </div>
    </article>
  );
}
