import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics";
import { fetchMyProfile } from "@/lib/profile";
import { fetchPortfolio, type PortfolioRow } from "@/lib/portfolio";
import { fetchWatchlist, type WatchlistRow } from "@/lib/watchlist";
import { useBrandsCatalog, parseEncodedBrand, type BrandRow } from "@/lib/catalog";
import { LIVE_CATEGORIES, useSignals, type SignalRow } from "@/lib/signals";
import type { Category } from "@/lib/quiz";
import { periodStartDate } from "@/lib/demo-price-history";

import { PeriodFilter, type PeriodValue } from "@/components/dashboard/PeriodFilter";
import { ValueCard } from "@/components/dashboard/ValueCard";
import { SignalStatCard } from "@/components/dashboard/SignalStatCard";
import { InsightsCard } from "@/components/dashboard/InsightsCard";

import { DashboardSkeleton } from "@/components/app/PageSkeletons";

export const Route = createFileRoute("/_authenticated/app/")({
  pendingComponent: DashboardSkeleton,
  component: DashboardPage,
});

function collectFollowedBrands(
  catalog: BrandRow[],
  profileBrands: string[],
  watchlist: WatchlistRow[],
): BrandRow[] {
  const seen = new Set<string>();
  const out: BrandRow[] = [];
  const push = (b: BrandRow | undefined) => {
    if (!b || seen.has(b.slug)) return;
    seen.add(b.slug);
    out.push(b);
  };
  for (const encoded of profileBrands ?? []) {
    const { name, category } = parseEncodedBrand(encoded);
    if (category) {
      push(catalog.find((b) => b.name === name && b.category === category));
    } else {
      catalog.filter((b) => b.name === name).forEach(push);
    }
  }
  for (const row of watchlist) {
    if (!row.is_active) continue;
    push(catalog.find((b) => b.name === row.brand && b.category === row.category));
  }
  return out;
}

function normModel(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DashboardPage() {
  const router = useRouter();
  const [pv, setPv] = useState<PeriodValue>({ period: "month" });

  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const portfolio = pfQ.data ?? [];
  const watchlist = wlQ.data ?? [];
  const catalog = catalogQ.data ?? [];

  const followedBrands = useMemo(
    () => collectFollowedBrands(catalog, [], watchlist),
    [catalog, watchlist],
  );

  const allRelevantSlugs = useMemo(() => followedBrands.map((b) => b.slug), [followedBrands]);

  // Shared hook: mute is applied here, above every derivation below, so the
  // stat tiles count exactly what /app/signals will list.
  const { signals: visibleSignals } = useSignals(allRelevantSlugs);

  const liveSignals: SignalRow[] = useMemo(
    () => visibleSignals.filter((r) => (LIVE_CATEGORIES as string[]).includes(r.category)),
    [visibleSignals],
  );

  // ---- period-scoped signal filtering ----
  const periodRange = useMemo(() => {
    if (pv.period === "custom" && pv.from && pv.to) {
      return { from: pv.from, to: pv.to };
    }
    return { from: periodStartDate(pv.period), to: new Date() };
  }, [pv]);

  const signalsInPeriod = useMemo(() => {
    const fromT = new Date(periodRange.from).setHours(0, 0, 0, 0);
    const toT = new Date(periodRange.to).setHours(23, 59, 59, 999);
    return liveSignals.filter((s) => {
      const t = new Date(s.signal_date).getTime();
      return t >= fromT && t <= toT;
    });
  }, [liveSignals, periodRange]);

  const slugFor = (brand: string, category: Category) =>
    catalog.find((b) => b.name === brand && b.category === category)?.slug ?? null;

  const counts = useMemo(() => {
    const pfWithSlug = portfolio
      .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
      .filter((x) => x.slug != null) as Array<{ row: PortfolioRow; slug: string }>;
    const wlWithSlug = watchlist
      .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
      .filter((x) => x.slug != null) as Array<{ row: WatchlistRow; slug: string }>;

    let watched = 0;
    let owned = 0;
    for (const s of signalsInPeriod) {
      const isBrand = !s.model || s.model.trim() === "";
      const model = normModel(s.model);
      const pfHit = pfWithSlug.some(
        (x) => x.slug === s.brand_slug && (isBrand || normModel(x.row.model) === model),
      );
      const wlHit = wlWithSlug.some((x) => {
        if (x.slug !== s.brand_slug) return false;
        if (isBrand) return true;
        if (x.row.type === "brand") return true;
        return normModel(x.row.model) === model;
      });
      if (pfHit) owned += 1;
      if (wlHit) watched += 1;
    }
    return { total: signalsInPeriod.length, watched, owned };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalsInPeriod, portfolio, watchlist, catalog]);

  const loading = profileQ.isLoading || pfQ.isLoading || wlQ.isLoading || catalogQ.isLoading;
  const errored = profileQ.isError || pfQ.isError || wlQ.isError || catalogQ.isError;

  useEffect(() => {
    if (!loading && !errored) {
      track("dashboard_viewed", {
        portfolio_count: portfolio.length,
        watchlist_count: watchlist.length,
        followed_brand_count: followedBrands.length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, errored]);

  function onPeriodChange(next: PeriodValue) {
    setPv(next);
    track("dashboard_period_changed", {
      period: next.period,
      from: next.from ? ymd(next.from) : undefined,
      to: next.to ? ymd(next.to) : undefined,
    });
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (errored) {
    return (
      <div>
        <PageHeader title="Your collection at a glance" />
        <EmptyState
          title="We couldn't load your dashboard"
          description="Give it another try."
          action={<Button onClick={() => router.invalidate()}>Retry</Button>}
        />
      </div>
    );
  }

  const periodParam = pv.period;
  const fromParam = pv.period === "custom" && pv.from ? ymd(pv.from) : undefined;
  const toParam = pv.period === "custom" && pv.to ? ymd(pv.to) : undefined;

  function clickCard(affected: "all" | "watchlist" | "portfolio") {
    track("dashboard_signal_card_clicked", {
      affected,
      period: periodParam,
      from: fromParam,
      to: toParam,
    });
  }

  function handleAddPortfolio() {
    track("dashboard_add_portfolio_clicked");
    router.navigate({ to: "/app/portfolio" });
  }

  const isFresh =
    portfolio.length === 0 && watchlist.length === 0 && (profileQ.data?.brands?.length ?? 0) === 0;
  const now = new Date();
  const updatedAt = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isFresh) {
    return (
      <div>
        <div className="rounded-2xl border border-hairline bg-surface p-8 sm:p-12 text-center">
          <div className="mx-auto max-w-xl">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-display font-semibold uppercase tracking-widest text-primary">
              Welcome, {profileQ.data?.display_name?.split(" ")[0] ?? "there"}
            </span>
            <h1 className="mt-4 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Set up your dashboard in 2 minutes
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Once you add a piece to your portfolio and follow a brand, you'll see live value
              tracking, price alerts, and market insights here.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={handleAddPortfolio}
                className="rounded-2xl border-2 border-primary bg-primary/5 p-5 transition hover:bg-primary/10"
              >
                <div className="font-display text-base font-semibold text-primary">
                  1. Add your first piece
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Watch, bag, or jewelry you already own.
                </div>
              </button>
              <button
                type="button"
                onClick={() => router.navigate({ to: "/app/watchlist" })}
                className="rounded-2xl border border-hairline bg-white p-5 transition hover:bg-surface-2"
              >
                <div className="font-display text-base font-semibold text-foreground">
                  2. Follow a brand
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Get pinged on drops, rises, and new releases.
                </div>
              </button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              {profileQ.data?.plan === "pro"
                ? "Pro plan · unlimited tracking"
                : "Free plan · no card required"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <PeriodFilter value={pv} onChange={onPeriodChange} />
        <span className="text-xs text-muted-foreground">Updated at {updatedAt}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <ValueCard
          portfolio={portfolio}
          period={pv.period}
          customRange={pv.period === "custom" ? { from: pv.from, to: pv.to } : undefined}
          hasItems={portfolio.length > 0}
          onAdd={handleAddPortfolio}
        />

        <InsightsCard
          signalsInPeriod={signalsInPeriod}
          followedBrandSlugs={followedBrands.map((b) => b.slug)}
          portfolio={portfolio}
          period={pv.period}
          customRange={pv.period === "custom" ? { from: pv.from, to: pv.to } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SignalStatCard
          label="Total price alerts"
          count={counts.total}
          affected="all"
          period={periodParam}
          from={fromParam}
          to={toParam}
          onClick={() => clickCard("all")}
        />
        <SignalStatCard
          label="PRICE ALERTS FOR WATCHLIST"
          count={counts.watched}
          affected="watchlist"
          period={periodParam}
          from={fromParam}
          to={toParam}
          onClick={() => clickCard("watchlist")}
        />
        <SignalStatCard
          label="PRICE ALERTS FOR PORTFOLIO"
          count={counts.owned}
          affected="portfolio"
          period={periodParam}
          from={fromParam}
          to={toParam}
          onClick={() => clickCard("portfolio")}
        />
      </div>
    </div>
  );
}
