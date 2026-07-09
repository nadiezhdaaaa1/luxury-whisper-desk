import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard } from "@/components/signals/SignalCard";
import { track } from "@/lib/analytics";
import { fetchMyProfile } from "@/lib/profile";
import { fetchWatchlist } from "@/lib/watchlist";
import { useBrandsCatalog, parseEncodedBrand, type BrandRow } from "@/lib/catalog";
import {
  SIGNAL_TYPE_LABELS,
  groupByDate,
  useSignalsForBrands,
  type SignalCategory,
  type SignalType,
} from "@/lib/signals";

type TypeFilter = "all" | SignalType;
type CategoryFilter = "all" | SignalCategory;

type Search = {
  type: TypeFilter;
  category: CategoryFilter;
  brand: string | null;
};

const TYPE_FILTERS: TypeFilter[] = ["all", "price_increase", "new_collection", "discount", "drop"];
const CATEGORY_FILTERS: CategoryFilter[] = ["all", "watches", "jewelry"];

export const Route = createFileRoute("/_authenticated/app/signals")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const type = TYPE_FILTERS.includes(s.type as TypeFilter) ? (s.type as TypeFilter) : "all";
    const category = CATEGORY_FILTERS.includes(s.category as CategoryFilter)
      ? (s.category as CategoryFilter)
      : "all";
    const brand = typeof s.brand === "string" && s.brand.length > 0 ? s.brand : null;
    return { type, category, brand };
  },
  component: SignalsPage,
});

function resolveBrandSlugs(
  catalog: BrandRow[],
  profileBrands: string[],
  watchlist: Array<{ brand: string; category: string; is_active: boolean }>,
): BrandRow[] {
  const seen = new Set<string>();
  const out: BrandRow[] = [];
  const push = (b: BrandRow | undefined) => {
    if (!b) return;
    if (seen.has(b.slug)) return;
    seen.add(b.slug);
    out.push(b);
  };

  for (const encoded of profileBrands ?? []) {
    const { name, category } = parseEncodedBrand(encoded);
    if (category) {
      push(catalog.find((b) => b.name === name && b.category === category));
    } else {
      // No category tag: include every category match.
      catalog.filter((b) => b.name === name).forEach(push);
    }
  }
  for (const row of watchlist ?? []) {
    if (!row.is_active) continue;
    push(
      catalog.find(
        (b) => b.name === row.brand && b.category === (row.category as BrandRow["category"]),
      ),
    );
  }
  return out;
}

function SignalsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();

  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const followedBrands = useMemo(() => {
    if (!profileQ.data || !catalogQ.data) return [];
    return resolveBrandSlugs(catalogQ.data, profileQ.data.brands ?? [], wlQ.data ?? []);
  }, [profileQ.data, wlQ.data, catalogQ.data]);

  const liveFollowedSlugs = useMemo(
    () => followedBrands.map((b) => b.slug),
    [followedBrands],
  );

  const signalsQ = useSignalsForBrands(liveFollowedSlugs);

  const filteredSignals = useMemo(() => {
    const rows = signalsQ.data ?? [];
    return rows.filter((r) => {
      if (search.type !== "all" && r.type !== search.type) return false;
      if (search.category !== "all" && r.category !== search.category) return false;
      if (search.brand && r.brand_slug !== search.brand) return false;
      return true;
    });
  }, [signalsQ.data, search.type, search.category, search.brand]);

  const groups = useMemo(() => groupByDate(filteredSignals), [filteredSignals]);

  // Analytics: signals_viewed once per load
  useEffect(() => {
    if (signalsQ.isSuccess) {
      track("signals_viewed", {
        followedCount: liveFollowedSlugs.length,
        resultCount: signalsQ.data?.length ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalsQ.isSuccess]);

  function setSearch(patch: Partial<Search>) {
    navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });
    track("signal_filtered", { ...search, ...patch });
  }

  const brandOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of followedBrands) {
      map.set(b.slug, b.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [followedBrands]);

  const isLoading =
    profileQ.isLoading || wlQ.isLoading || catalogQ.isLoading ||
    (liveFollowedSlugs.length > 0 && signalsQ.isLoading);

  return (
    <div>
      <PageHeader
        title="Signals"
        subtitle="Retail moves for the brands you follow."
      />

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Signals are estimates, not investment advice.</span>
      </div>

      {liveFollowedSlugs.length > 0 ? (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((t) => (
              <FilterChip
                key={t}
                active={search.type === t}
                onClick={() => setSearch({ type: t })}
              >
                {t === "all" ? "All" : SIGNAL_TYPE_LABELS[t]}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <FilterChip
                key={c}
                active={search.category === c}
                onClick={() => setSearch({ category: c })}
                subtle
              >
                {c === "all" ? "All categories" : c === "watches" ? "Watches" : "Jewelry"}
              </FilterChip>
            ))}
            {brandOptions.length > 0 ? (
              <select
                value={search.brand ?? ""}
                onChange={(e) => setSearch({ brand: e.target.value || null })}
                className="ml-auto rounded-full border border-hairline bg-background px-3 py-1 text-xs font-display font-semibold text-foreground"
              >
                <option value="">All brands</option>
                {brandOptions.map(([slug, name]) => (
                  <option key={slug} value={slug}>{name}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (profileQ.isError || wlQ.isError || catalogQ.isError || signalsQ.isError) {
      return (
        <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">
            We couldn't load signals
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Give it another try.
          </p>
          <Button className="mt-4" onClick={() => router.invalidate()}>Retry</Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      );
    }

    if (liveFollowedSlugs.length === 0) {
      return (
        <EmptyState
          title="Start following brands to see signals"
          description="Add brands to your watchlist and we'll surface every meaningful retail move here."
          action={
            <Button asChild>
              <Link to="/app/watchlist">Go to watchlist</Link>
            </Button>
          }
        />
      );
    }

    if (filteredSignals.length === 0) {
      return (
        <EmptyState
          title="No signals yet"
          description="We'll alert you the moment your brands move."
        />
      );
    }

    return (
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {g.label}
              </h2>
              <div className="h-px flex-1 bg-hairline" />
            </div>
            <div className="space-y-3">
              {g.items.map((s) => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
}

function FilterChip({
  active,
  onClick,
  subtle,
  children,
}: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : subtle
            ? "bg-transparent text-muted-foreground border-hairline hover:bg-surface-2"
            : "bg-background text-foreground border-hairline hover:bg-surface-2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
