import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Watch, Gem, ShoppingBag, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortfolioRow } from "@/lib/portfolio";
import type { Category } from "@/lib/quiz";
import { summarizeMarket, summarizePurchase } from "@/lib/demo-market-prices";
import { track } from "@/lib/analytics";

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Tab = "purchase" | "market";

type Props = {
  rows: PortfolioRow[];
};

const CAT_ICON: Record<Category, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

export function PortfolioBreakdown({ rows }: Props) {
  const [tab, setTab] = useState<Tab>("market");
  const purchase = useMemo(() => summarizePurchase(rows), [rows]);
  const market = useMemo(() => summarizeMarket(rows), [rows]);

  function selectTab(t: Tab) {
    if (t === tab) return;
    setTab(t);
    track("portfolio_value_tab_switched", { tab: t });
  }

  const columns: Array<{ key: "all" | Category; label: string; icon: typeof Watch | null }> = [
    { key: "all", label: "All", icon: null },
    { key: "watches", label: "Watches", icon: CAT_ICON.watches },
    { key: "jewelry", label: "Jewelry", icon: CAT_ICON.jewelry },
    { key: "bags", label: "Bags", icon: CAT_ICON.bags },
  ];

  return (
    <section className="card-flat mb-6 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            Portfolio analytics
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="What is market value and purchase value?"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-[16rem]">
                <div className="space-y-2">
                  <div>
                    <p className="font-display font-semibold text-primary-foreground">Market value</p>
                    <p className="text-xs text-primary-foreground/80">
                      Current estimated resale price of your pieces based on market demand and comparable sales.
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-primary-foreground">Purchase value</p>
                    <p className="text-xs text-primary-foreground/80">
                      The total price you originally paid for the pieces in your portfolio.
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex w-full flex-nowrap items-center rounded-full border border-hairline bg-surface p-0.5 sm:w-auto">
          <TabBtn active={tab === "market"} onClick={() => selectTab("market")}>
            Market value
          </TabBtn>
          <TabBtn active={tab === "purchase"} onClick={() => selectTab("purchase")}>
            Purchase value
          </TabBtn>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {columns.map((c, i) => {
          const p = purchase[c.key];
          const m = market[c.key];
          const value = tab === "purchase" ? p.value : m.value;
          const pct = tab === "market" ? m.pctVsPurchase : null;
          return (
            <div
              key={c.key}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl bg-surface px-2 py-3 sm:px-4 sm:py-4",
                i > 0 && "sm:border-l sm:border-hairline sm:rounded-l-none sm:bg-transparent",
              )}
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {c.icon ? <c.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                <span className="font-display text-[10px] font-semibold uppercase tracking-widest">
                  {c.label}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">
                  {p.count}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 font-display font-semibold tracking-tight text-2xl sm:text-3xl leading-none tabular-nums",
                  tab === "market" && pct != null
                    ? pct >= 0
                      ? "text-positive"
                      : "text-alert"
                    : "text-primary",
                )}
              >
                {fmtUSD(value)}
              </div>
              {tab === "market" && pct != null ? (
                <div
                  className={cn(
                    "mt-1 inline-flex items-center gap-0.5 text-xs font-semibold",
                    pct >= 0 ? "text-positive" : "text-alert",
                  )}
                >
                  {pct >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {(pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-full px-2 py-1.5 text-[10px] sm:px-3 sm:text-xs font-display font-semibold uppercase tracking-widest whitespace-nowrap transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
