import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, LineChart, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  relativeTime,
  SIGNAL_TYPE_LABELS,
  type SignalRow,
} from "@/lib/signals";
import { SIGNAL_TYPE_STYLE } from "@/lib/signal-type";
import type { PortfolioRow } from "@/lib/portfolio";
import type { Period } from "@/lib/demo-price-history";
import { getMovers, PERIOD_TITLE, type Mover } from "@/lib/demo-movers";
import emptyPortfolioAsset from "@/assets/empty-portfolio.png.asset.json";

type TabKey = "latest_signals" | "movers";
const STORAGE_KEY = "dashboard.insightsTab";

type Props = {
  signalsInPeriod: SignalRow[];
  followedBrandSlugs: string[];
  portfolio: PortfolioRow[];
  period: Period;
  customRange?: { from?: Date; to?: Date };
};

export function InsightsCard({
  signalsInPeriod,
  followedBrandSlugs,
  portfolio,
  period,
  customRange,
}: Props) {
  const [tab, setTab] = useState<TabKey>("latest_signals");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved === "movers" || saved === "latest_signals") setTab(saved);
  }, []);

  function selectTab(next: TabKey) {
    setTab(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    }
    track("dashboard_card_tab_switched", { tab: next, period });
  }

  return (
    <section className="rounded-2xl border border-hairline bg-card h-auto sm:h-[340px] flex flex-col p-4 sm:p-7">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div
          role="tablist"
          className="inline-flex rounded-full border border-hairline bg-background p-0.5"
        >
          <TabButton active={tab === "latest_signals"} onClick={() => selectTab("latest_signals")}>
            Latest signals
          </TabButton>
          <TabButton active={tab === "movers"} onClick={() => selectTab("movers")}>
            Movers
          </TabButton>
        </div>
        {tab === "latest_signals" ? (
          <Link
            to="/app/signals"
            className="inline-flex items-center gap-1 text-sm font-display font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {PERIOD_TITLE[period]}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "latest_signals" ? (
          <LatestSignalsTab
            signals={signalsInPeriod}
            followedBrandSlugs={followedBrandSlugs}
            period={period}
          />
        ) : (
          <MoversTab
            portfolio={portfolio}
            period={period}
            customRange={customRange}
          />
        )}
      </div>
    </section>
  );
}

function TabButton({
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-display font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─────────── Latest signals ───────────

function LatestSignalsTab({
  signals,
  followedBrandSlugs,
  period,
}: {
  signals: SignalRow[];
  followedBrandSlugs: string[];
  period: Period;
}) {
  const followed = useMemo(() => new Set(followedBrandSlugs), [followedBrandSlugs]);

  const rows = useMemo(() => {
    return [...signals]
      .filter((s) => followed.has(s.brand_slug))
      .sort(
        (a, b) =>
          new Date(b.signal_date).getTime() - new Date(a.signal_date).getTime(),
      )
      .slice(0, 5);
  }, [signals, followed]);

  if (followed.size === 0 || rows.length === 0) {
    return (
      <EmptyBlock
        icon={<Bell className="h-6 w-6" />}
        title="No signals yet"
        body="Add brands to your watchlist and we'll surface the latest moves here."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/watchlist">Go to watchlist</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ul className="flex-1 flex flex-col gap-1.5">
        {rows.map((s) => {
          const style = SIGNAL_TYPE_STYLE[s.type];
          const Icon = style.icon;
          return (
            <li key={s.id}>
              <Link
                to="/app/signals"
                onClick={() =>
                  track("dashboard_latest_signal_clicked", {
                    brand_slug: s.brand_slug,
                    signal_type: s.type,
                    period,
                  })
                }
                className="group flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest",
                    style.bg,
                    style.text,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {SIGNAL_TYPE_LABELS[s.type]}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <span className="font-medium">{s.brand_name}</span>
                  {s.model ? (
                    <span className="text-muted-foreground"> · {s.model}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {relativeTime(s.signal_date)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────── Movers ───────────

function MoversTab({
  portfolio,
  period,
  customRange,
}: {
  portfolio: PortfolioRow[];
  period: Period;
  customRange?: { from?: Date; to?: Date };
}) {
  const { gainers, losers } = useMemo(
    () => getMovers(portfolio, period, customRange),
    [portfolio, period, customRange],
  );

  if (portfolio.length === 0 || (gainers.length === 0 && losers.length === 0)) {
    return (
      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-muted-foreground">
        <img
          src={emptyPortfolioAsset.url}
          alt="Empty movers"
          className="h-20 w-auto opacity-90"
        />
        <p className="mt-4 text-[13px] italic">Waiting for you to add your first piece</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-auto sm:h-full">
      {gainers.length > 0 ? (
        <MoverGroup title="Top gainers" rows={gainers} direction="gain" period={period} />
      ) : null}
      {losers.length > 0 ? (
        <MoverGroup title="Top losers" rows={losers} direction="loss" period={period} />
      ) : null}
    </div>
  );
}

function MoverGroup({
  title,
  rows,
  direction,
  period,
}: {
  title: string;
  rows: Mover[];
  direction: "gain" | "loss";
  period: Period;
}) {
  const colorClass =
    direction === "gain"
      ? "text-[color:var(--positive)]"
      : "text-[color:var(--alert)]";

  return (
    <div className="p-1">
      <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </h4>
      <ul className="divide-y divide-hairline">
        {rows.map((m) => (
          <li key={m.id}>
            <Link
              to="/app/portfolio"
              onClick={() =>
                track("dashboard_movers_row_clicked", {
                  brand_slug: m.brand,
                  direction,
                  period,
                })
              }
              className="flex items-center justify-between gap-3 py-3 -mx-1 px-1 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {m.brand}
                  {m.model ? (
                    <span className="text-muted-foreground"> · {m.model}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${m.currentPrice.toLocaleString()}
                </div>
              </div>
              <span className={cn("shrink-0 text-sm font-display font-semibold tabular-nums", colorClass)}>
                {m.deltaPct >= 0 ? "+" : ""}
                {m.deltaPct.toFixed(1)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────── Shared empty state ───────────

function EmptyBlock({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        {icon}
      </div>
      <div className="font-display text-base font-semibold text-foreground">
        {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
