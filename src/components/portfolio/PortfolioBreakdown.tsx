import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Watch, Gem, ShoppingBag } from "lucide-react";
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
  const [tab, setTab] = useState<Tab>("purchase");
  const purchase = useMemo(() => summarizePurchase(rows), [rows]);
  const market = useMemo(() => summarizeMarket(rows), [rows]);

  function selectTab(t: Tab) {
    if (t === tab) return;
    setTab(t);
    track("portfolio_value_tab_switched", { tab: t });
  }

  const columns: Array<{ key: "all" | Category; label: string; icon: typeof Watch | null }> = [
    { key: "all", label: "ALL", icon: null },
    { key: "watches", label: "WATCHES", icon: CAT_ICON.watches },
    { key: "jewelry", label: "JEWELRY", icon: CAT_ICON.jewelry },
    { key: "bags", label: "BAGS", icon: CAT_ICON.bags },
  ];

  return (
    <section className="card-flat mb-8 p-5 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <p className="eyebrow">Portfolio breakdown</p>
        <div className="inline-flex items-center rounded-full border border-hairline bg-background p-0.5 text-[11px] font-display font-semibold uppercase tracking-widest">
          <TabBtn active={tab === "market"} onClick={() => selectTab("market")}>
            Market value
          </TabBtn>
          <TabBtn active={tab === "purchase"} onClick={() => selectTab("purchase")}>
            Purchase value
          </TabBtn>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
        {columns.map((c, i) => {
          const p = purchase[c.key];
          const m = market[c.key];
          const value = tab === "purchase" ? p.value : m.value;
          const pct = tab === "market" ? m.pctVsPurchase : null;
          return (
            <div
              key={c.key}
              className={
                "px-4 sm:px-6 text-center " +
                (i > 0 ? "sm:border-l sm:border-hairline" : "")
              }
            >
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                {c.icon ? <c.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                <span className="font-display text-[11px] font-semibold uppercase tracking-widest">
                  {c.label}
                </span>
                <span className="text-xs text-muted-foreground/80">{p.count}</span>
              </div>
              <div className="mt-2 font-display font-semibold tracking-tight text-primary text-2xl sm:text-3xl leading-none">
                {fmtUSD(value)}
              </div>
              {tab === "market" && pct != null ? (
                <div
                  className={
                    "mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold " +
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
      className={
        "rounded-full px-3 py-1.5 transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
