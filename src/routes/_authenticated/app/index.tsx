import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, ArrowUpRight, ImageIcon, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard } from "@/components/signals/SignalCard";
import { track } from "@/lib/analytics";
import { fetchMyProfile } from "@/lib/profile";
import { fetchPortfolio, computeTotals, type PortfolioRow } from "@/lib/portfolio";
import { fetchWatchlist, type WatchlistRow } from "@/lib/watchlist";
import { useBrandsCatalog, parseEncodedBrand, type BrandRow } from "@/lib/catalog";
import {
  LIVE_CATEGORIES,
  SIGNAL_TYPE_LABELS,
  fetchSignalsForSlugs,
  relativeTime,
  type SignalRow,
  type SignalType,
} from "@/lib/signals";
import { CATEGORY_LABELS, type Category } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

// ---------- helpers ----------

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// Type priority (higher = more important)
const TYPE_WEIGHT: Record<SignalType, number> = {
  price_increase: 4,
  drop: 3,
  discount: 2,
  new_collection: 1,
};

type ImportantSignal = {
  signal: SignalRow;
  portfolioMatches: PortfolioRow[];
  watchlistMatches: WatchlistRow[];
  precision: "brand" | "piece"; // brand-level or exact
  score: number;
};

function normModel(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function rankImportantSignals(
  signals: SignalRow[],
  portfolio: PortfolioRow[],
  watchlist: WatchlistRow[],
  catalog: BrandRow[],
): ImportantSignal[] {
  // Build lookup for each row's brand_slug via catalog.
  function slugFor(brand: string, category: Category): string | null {
    const hit = catalog.find((b) => b.name === brand && b.category === category);
    return hit?.slug ?? null;
  }

  const pfWithSlug = portfolio
    .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
    .filter((x) => x.slug != null) as Array<{ row: PortfolioRow; slug: string }>;

  const wlWithSlug = watchlist
    .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
    .filter((x) => x.slug != null) as Array<{ row: WatchlistRow; slug: string }>;

  const now = Date.now();
  const out: ImportantSignal[] = [];

  for (const s of signals) {
    const isBrandLevel = !s.model || s.model.trim() === "";
    const model = normModel(s.model);

    const pfMatches = pfWithSlug
      .filter((x) => x.slug === s.brand_slug)
      .filter((x) => (isBrandLevel ? true : normModel(x.row.model) === model))
      .map((x) => x.row);

    const wlMatches = wlWithSlug
      .filter((x) => x.slug === s.brand_slug)
      .filter((x) => {
        if (isBrandLevel) return true; // brand-level signal touches everything for that slug
        // piece signals touch: exact piece match, OR a brand-typed watchlist row
        if (x.row.type === "brand") return true;
        return normModel(x.row.model) === model;
      })
      .map((x) => x.row);

    if (pfMatches.length === 0 && wlMatches.length === 0) continue;

    // Score:
    //  - portfolio matches weigh 2x watchlist matches
    //  - type weight (max 4)
    //  - recency: decays over 30 days from 3 → 0
    const ageDays = Math.max(0, (now - new Date(s.signal_date).getTime()) / 86_400_000);
    const recency = Math.max(0, 3 - ageDays / 10); // 0d→3, 30d→0
    const affected = pfMatches.length * 2 + wlMatches.length;
    const score = affected * 10 + TYPE_WEIGHT[s.type] * 2 + recency;

    out.push({
      signal: s,
      portfolioMatches: pfMatches,
      watchlistMatches: wlMatches,
      precision: isBrandLevel ? "brand" : "piece",
      score,
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

// Resolve the full set of followed brand slugs (profile + watchlist) — same
// logic the Signals page uses, minus the LIVE_CATEGORIES gate so we can also
// look up watchlist targets etc.
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

// ---------- page ----------

function DashboardPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const portfolio = pfQ.data ?? [];
  const watchlist = wlQ.data ?? [];
  const catalog = catalogQ.data ?? [];

  const followedBrands = useMemo(
    () => collectFollowedBrands(catalog, profileQ.data?.brands ?? [], watchlist),
    [catalog, profileQ.data?.brands, watchlist],
  );

  // For Important + Latest we need slugs the user has any relationship with,
  // including portfolio brand_slugs (they should be surfaced even if the
  // brand isn't in the watchlist / profile brands).
  const allRelevantSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const b of followedBrands) set.add(b.slug);
    for (const p of portfolio) {
      const hit = catalog.find((b) => b.name === p.brand && b.category === p.category);
      if (hit) set.add(hit.slug);
    }
    return [...set];
  }, [followedBrands, portfolio, catalog]);

  const signalsQ = useQuery({
    queryKey: ["signals", "slugs", [...allRelevantSlugs].sort()],
    queryFn: () => fetchSignalsForSlugs(allRelevantSlugs),
    enabled: allRelevantSlugs.length > 0,
    staleTime: 60_000,
  });

  const liveSignals = useMemo(() => {
    const rows = signalsQ.data ?? [];
    return rows.filter((r) => (LIVE_CATEGORIES as string[]).includes(r.category));
  }, [signalsQ.data]);

  const important = useMemo(
    () => rankImportantSignals(liveSignals, portfolio, watchlist, catalog).slice(0, 5),
    [liveSignals, portfolio, watchlist, catalog],
  );

  // Latest signals filtered to the user's followed brands (mirrors Signals feed).
  const latestSignals = useMemo(() => {
    const followedSlugs = new Set(followedBrands.map((b) => b.slug));
    return liveSignals.filter((s) => followedSlugs.has(s.brand_slug)).slice(0, 5);
  }, [liveSignals, followedBrands]);

  const totals = useMemo(() => computeTotals(portfolio), [portfolio]);

  const loading =
    profileQ.isLoading || pfQ.isLoading || wlQ.isLoading || catalogQ.isLoading;
  const errored =
    profileQ.isError || pfQ.isError || wlQ.isError || catalogQ.isError;

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

  useEffect(() => {
    if (important.length > 0) {
      track("important_signal_viewed", { count: important.length });
    }
  }, [important.length]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Your collection at a glance" subtitle="Signals, watchlist, and portfolio — one command center." />
        <Skeleton className="h-64 w-full rounded-3xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
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

  const firstName = (profileQ.data?.display_name ?? "").split(/\s+/)[0] ?? "";

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Your collection at a glance"}
        subtitle="Signals, watchlist, and portfolio — one command center."
      />

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Values and signals are estimates, not investment advice.</span>
      </div>

      {/* Row 1 — Portfolio value + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PortfolioValueTile totals={totals} />
        </div>
        <div>
          <CategoryBreakdown rows={portfolio} />
        </div>
      </div>

      {/* Row 2 — Important signals */}
      <section className="mb-8">
        <SectionHeader
          eyebrow="Important signals"
          title="What matters to your collection"
          subtitle="Ranked by how many of your pieces they touch."
        />
        <ImportantSignalsPanel
          items={important}
          hasAnyHoldings={portfolio.length + watchlist.length > 0}
          onView={(slug) => {
            track("important_signal_view_clicked", { brand_slug: slug });
            navigate({ to: "/app/signals", search: { type: "all", category: "all", brand: slug } });
          }}
        />
      </section>

      {/* Row 3 — Latest signals + Watchlist targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section>
          <SectionHeader
            eyebrow="Latest signals"
            title="Fresh from your brands"
            actionLabel="View all signals"
            actionTo="/app/signals"
          />
          <LatestSignalsStrip
            signals={latestSignals}
            onClick={(s) => {
              track("dashboard_latest_signal_clicked", {
                signal_id: s.id,
                brand_slug: s.brand_slug,
              });
              navigate({
                to: "/app/signals",
                search: { type: "all", category: "all", brand: s.brand_slug },
              });
            }}
          />
        </section>
        <section>
          <SectionHeader
            eyebrow="Watchlist targets"
            title="Prices you're waiting for"
            actionLabel="Go to watchlist"
            actionTo="/app/watchlist"
          />
          <WatchlistTargetsPanel rows={watchlist} />
        </section>
      </div>
    </div>
  );
}

// ---------- shared UI ----------

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  actionTo,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: "/app/signals" | "/app/watchlist" | "/app/portfolio";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1 text-xs font-display font-semibold text-primary hover:underline underline-offset-4 shrink-0"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

// ---------- Panel 1: Portfolio value ----------

type ValueTab = "purchase" | "market";

function PortfolioValueTile({
  totals,
}: {
  totals: { total: number; pricedCount: number; totalCount: number };
}) {
  const [tab, setTab] = useState<ValueTab>("purchase");
  const hasAnyPriced = totals.pricedCount > 0;
  const partial = totals.pricedCount > 0 && totals.pricedCount < totals.totalCount;

  function switchTab(next: ValueTab) {
    if (next === tab) return;
    setTab(next);
    track("dashboard_value_tab_switched", { tab: next });
  }

  return (
    <section className="h-full rounded-3xl border border-hairline bg-champagne-soft/40 p-6 sm:p-8 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Portfolio value
        </p>
        <div className="inline-flex rounded-full border border-hairline bg-background p-0.5" role="tablist">
          <TabButton active={tab === "purchase"} onClick={() => switchTab("purchase")}>
            Purchase value
          </TabButton>
          <TabButton active={tab === "market"} onClick={() => switchTab("market")}>
            Market value
          </TabButton>
        </div>
      </div>

      {tab === "purchase" ? (
        <div className="flex-1 flex flex-col">
          {hasAnyPriced ? (
            <div className="font-display font-bold tracking-tight text-primary text-4xl sm:text-6xl leading-none">
              {fmtUSD(totals.total)}
            </div>
          ) : (
            <div className="font-display font-semibold tracking-tight text-foreground text-2xl sm:text-3xl leading-tight max-w-xl">
              Add items with their purchase price to see your total
            </div>
          )}
          {partial ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Based on {totals.pricedCount} of {totals.totalCount} items with a purchase price.
            </p>
          ) : null}
          <div className="mt-auto pt-6">
            <Link
              to="/app/portfolio"
              className="inline-flex items-center gap-1 text-xs font-display font-semibold text-primary hover:underline underline-offset-4"
            >
              Manage portfolio
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="font-display font-semibold tracking-tight text-foreground text-2xl sm:text-3xl leading-tight max-w-xl">
            Live market valuation coming soon
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">
            We'll show what your collection is worth right now, priced from live retail and resale
            data — no guessing.
          </p>
          <div className="mt-auto pt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-display font-semibold uppercase tracking-widest px-2.5 py-1">
              <Sparkles className="h-3 w-3" /> Coming with Pro
            </span>
          </div>
        </div>
      )}
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
      className={[
        "rounded-full px-3 py-1 text-[11px] font-display font-semibold uppercase tracking-widest transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ---------- Panel 2: Important signals ----------

function ImportantSignalsPanel({
  items,
  hasAnyHoldings,
  onView,
}: {
  items: ImportantSignal[];
  hasAnyHoldings: boolean;
  onView: (brandSlug: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={hasAnyHoldings
          ? "No important signals right now"
          : "Add pieces to see what matters"}
        description={hasAnyHoldings
          ? "We'll surface the ones that affect your pieces."
          : "Follow brands or add portfolio pieces so we can highlight the signals that touch them."}
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ImportantSignalCard key={item.signal.id} item={item} onView={onView} />
      ))}
    </div>
  );
}

const TYPE_ACCENT: Record<SignalType, { bg: string; text: string }> = {
  price_increase: { bg: "bg-amber-100", text: "text-amber-800" },
  new_collection: { bg: "bg-primary/10", text: "text-primary" },
  discount: { bg: "bg-emerald-100", text: "text-emerald-800" },
  drop: { bg: "bg-purple-100", text: "text-purple-800" },
};

function ImportantSignalCard({
  item,
  onView,
}: {
  item: ImportantSignal;
  onView: (brandSlug: string) => void;
}) {
  const { signal, portfolioMatches, watchlistMatches, precision } = item;
  const accent = TYPE_ACCENT[signal.type];
  const verb = precision === "brand" ? "may affect" : "affects";
  const parts: string[] = [];
  if (portfolioMatches.length > 0) {
    parts.push(
      `${portfolioMatches.length} portfolio ${portfolioMatches.length === 1 ? "piece" : "pieces"}`,
    );
  }
  if (watchlistMatches.length > 0) {
    parts.push(
      `${watchlistMatches.length} watchlist ${watchlistMatches.length === 1 ? "piece" : "pieces"}`,
    );
  }
  const detailLine = `This ${verb} ${parts.join(" and ")}.`;

  return (
    <article className="rounded-2xl border border-hairline bg-card shadow-soft overflow-hidden">
      <div className="p-5 border-b border-hairline">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest ${accent.bg} ${accent.text}`}>
              {SIGNAL_TYPE_LABELS[signal.type]}
            </span>
            <span className="font-medium text-foreground truncate">
              {signal.brand_name}
              {signal.model ? (
                <span className="text-muted-foreground"> · {signal.model}</span>
              ) : null}
            </span>
          </div>
          <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
            {relativeTime(signal.signal_date)}
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-foreground">
          {signal.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{signal.body}</p>
      </div>

      <div className="p-5 bg-surface/40">
        <p className="text-xs font-display font-semibold text-foreground">{detailLine}</p>

        {portfolioMatches.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              From your portfolio
            </p>
            <div className="flex flex-wrap gap-2">
              {portfolioMatches.slice(0, 6).map((p) => (
                <PortfolioThumb key={p.id} row={p} />
              ))}
              {portfolioMatches.length > 6 ? (
                <span className="inline-flex items-center h-14 px-3 rounded-lg bg-surface-2 text-xs text-muted-foreground">
                  +{portfolioMatches.length - 6} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {watchlistMatches.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              From your watchlist
            </p>
            <div className="flex flex-wrap gap-2">
              {watchlistMatches.slice(0, 8).map((w) => (
                <WatchlistChip key={w.id} row={w} />
              ))}
              {watchlistMatches.length > 8 ? (
                <span className="inline-flex items-center rounded-full border border-hairline bg-background px-3 py-1 text-xs text-muted-foreground">
                  +{watchlistMatches.length - 8} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(signal.brand_slug)}
            className="text-primary hover:text-primary"
          >
            View
            <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function PortfolioThumb({ row }: { row: PortfolioRow }) {
  const label = row.model ? `${row.brand} · ${row.model}` : row.brand;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-hairline bg-background pr-3"
      title={label}
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-l-lg bg-champagne-soft/60">
        {row.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.photo_url}
            alt={label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <ImageIcon className="h-5 w-5 opacity-50" />
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-[10rem]">
        <div className="font-display text-xs font-semibold truncate text-foreground">
          {row.brand}
        </div>
        {row.model ? (
          <div className="text-[11px] text-muted-foreground truncate">{row.model}</div>
        ) : null}
      </div>
    </div>
  );
}

function WatchlistChip({ row }: { row: WatchlistRow }) {
  const label = row.type === "piece" && row.model
    ? `${row.brand} · ${row.model}`
    : row.brand;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-2.5 py-1 text-xs text-foreground"
      title={label}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${row.type === "piece" ? "bg-primary" : "bg-muted-foreground/50"}`} />
      <span className="max-w-[14rem] truncate">{label}</span>
    </span>
  );
}

// ---------- Panel 3: Latest signals strip ----------

function LatestSignalsStrip({
  signals,
  onClick,
}: {
  signals: SignalRow[];
  onClick: (s: SignalRow) => void;
}) {
  if (signals.length === 0) {
    return (
      <EmptyState
        title="No recent signals"
        description="When your brands move, they'll show up here first."
      />
    );
  }
  return (
    <ul className="rounded-2xl border border-hairline bg-card shadow-soft divide-y divide-hairline">
      {signals.map((s) => {
        const accent = TYPE_ACCENT[s.type];
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onClick(s)}
              className="w-full text-left px-4 py-3 hover:bg-surface/60 transition-colors flex items-start gap-3"
            >
              <span
                className={`mt-0.5 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-widest ${accent.bg} ${accent.text}`}
              >
                {SIGNAL_TYPE_LABELS[s.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-display font-semibold text-foreground truncate">
                  {s.brand_name}
                  {s.model ? (
                    <span className="text-muted-foreground font-medium"> · {s.model}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground truncate">{s.title}</div>
              </div>
              <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
                {relativeTime(s.signal_date)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Panel 4: Watchlist targets ----------

function WatchlistTargetsPanel({ rows }: { rows: WatchlistRow[] }) {
  const targets = rows.filter(
    (r) => r.target_price != null && Number(r.target_price) > 0,
  );

  if (targets.length === 0) {
    return (
      <EmptyState
        title="No targets yet"
        description="Set a target price on a watchlist piece and we'll surface it here."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-card shadow-soft overflow-hidden">
      <ul className="divide-y divide-hairline">
        {targets.slice(0, 6).map((row) => (
          <li key={row.id} className="px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-display font-semibold text-foreground truncate">
                {row.brand}
                {row.model ? (
                  <span className="text-muted-foreground font-medium"> · {row.model}</span>
                ) : null}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Target · {fmtUSD(Number(row.target_price))}
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-display font-semibold uppercase tracking-widest px-2 py-0.5">
              <Sparkles className="h-3 w-3" /> Live pricing soon
            </span>
          </li>
        ))}
      </ul>
      <div className="px-4 py-2.5 text-[11px] text-muted-foreground border-t border-hairline bg-surface/40">
        We'll alert you when it hits your target — live pricing coming soon.
      </div>
    </div>
  );
}

// ---------- Panel 5: Category breakdown ----------

function CategoryBreakdown({ rows }: { rows: PortfolioRow[] }) {
  const byCat = useMemo(() => {
    const totals: Record<Category, number> = { watches: 0, jewelry: 0, bags: 0 };
    for (const r of rows) {
      if (r.purchase_price == null) continue;
      const n = Number(r.purchase_price);
      if (!Number.isFinite(n)) continue;
      totals[r.category] = (totals[r.category] ?? 0) + n;
    }
    return totals;
  }, [rows]);

  // Bags are coming-soon in the live product — exclude from the split.
  const visible: Array<{ category: Category; value: number; label: string; color: string }> = [
    { category: "watches", value: byCat.watches, label: CATEGORY_LABELS.watches, color: "hsl(var(--primary))" },
    { category: "jewelry", value: byCat.jewelry, label: CATEGORY_LABELS.jewelry, color: "#B58B4D" },
  ];
  const total = visible.reduce((s, c) => s + c.value, 0);

  if (total <= 0) {
    return (
      <section className="h-full rounded-3xl border border-hairline bg-card p-6 flex flex-col">
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
          Category breakdown
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
          By purchase value
        </h3>
        <div className="mt-6 flex-1 flex flex-col items-center justify-center text-center">
          <div className="h-32 w-32 rounded-full border-8 border-dashed border-hairline" />
          <p className="mt-4 text-xs text-muted-foreground max-w-xs">
            Add pieces with purchase prices to see how your value splits across categories.
          </p>
        </div>
      </section>
    );
  }

  // Build a conic-gradient string.
  let acc = 0;
  const stops = visible
    .filter((c) => c.value > 0)
    .map((c) => {
      const start = (acc / total) * 100;
      acc += c.value;
      const end = (acc / total) * 100;
      return `${c.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <section className="h-full rounded-3xl border border-hairline bg-card p-6 flex flex-col">
      <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
        Category breakdown
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
        By purchase value
      </h3>

      <div className="mt-6 flex items-center gap-6">
        <div
          className="relative h-32 w-32 rounded-full shrink-0"
          style={{ background: `conic-gradient(${stops})` }}
          aria-hidden
        >
          <div className="absolute inset-3 rounded-full bg-card grid place-items-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Total
              </div>
              <div className="font-display font-bold text-sm text-foreground">
                {fmtUSD(total)}
              </div>
            </div>
          </div>
        </div>

        <ul className="flex-1 space-y-2 min-w-0">
          {visible.map((c) => {
            const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
            return (
              <li key={c.category} className="flex items-center gap-3 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: c.color }}
                />
                <span className="text-xs font-display font-semibold text-foreground flex-1 truncate">
                  {c.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pct}% · {fmtUSD(c.value)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        Bags coming soon — they won't count toward this split yet.
      </p>
    </section>
  );
}
