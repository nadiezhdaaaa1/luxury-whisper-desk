import { MoreVertical, ImageIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortfolioRow } from "@/lib/portfolio";
import { relativeTime, type SignalRow } from "@/lib/signals";

type Props = {
  row: PortfolioRow;
  lastSignal?: SignalRow | null;
  readOnly?: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PortfolioCard({ row, lastSignal, readOnly, onEdit, onRemove }: Props) {
  const hasBelow = row.alert_below_enabled && row.alert_below_price != null;
  const hasAbove = row.alert_above_enabled && row.alert_above_price != null;
  const isBags = row.category === "bags";
  const showSignal = !isBags && lastSignal;

  return (
    <article className={`rounded-2xl border border-hairline bg-surface overflow-hidden flex flex-col shadow-soft ${readOnly ? "opacity-90" : ""}`}>
      <div className="relative aspect-[4/3] w-full bg-champagne-soft/60">
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
        {readOnly ? (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 border border-hairline px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            <Lock className="h-3 w-3" /> Read-only
          </div>
        ) : null}
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

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <div className="font-display font-semibold text-base leading-tight text-foreground">
            {row.brand}
          </div>
          {row.model ? (
            <div className="text-sm text-muted-foreground">{row.model}</div>
          ) : null}
        </div>

        <dl className="mt-2 space-y-1.5 text-xs">
          {showSignal ? (
            <Row label="Last signal" value={relativeTime(lastSignal!.signal_date)} />
          ) : (
            <Row label="Last signal" value="no signals yet" muted />
          )}
          <Row label="Current market price" value="coming soon" muted />
          {row.purchase_price != null ? (
            <Row label="Purchase price" value={fmtUSD(Number(row.purchase_price))} />
          ) : null}
          {hasBelow ? (
            <Row label="Alert below" value={fmtUSD(Number(row.alert_below_price))} />
          ) : null}
          {hasAbove ? (
            <Row label="Alert above" value={fmtUSD(Number(row.alert_above_price))} />
          ) : null}
          {row.signal_every_move ? (
            <Row label="Signals" value="every price move" />
          ) : null}
        </dl>
      </div>
    </article>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground italic" : "font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
