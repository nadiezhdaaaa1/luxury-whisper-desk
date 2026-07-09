import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Info, RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImportantSignalCard,
  type SignalCardData,
} from "@/components/signals/ImportantSignalCard";
import { track } from "@/lib/analytics";
import { fetchMyProfile } from "@/lib/profile";
import { fetchWatchlist, type WatchlistRow } from "@/lib/watchlist";
import { fetchPortfolio, type PortfolioRow } from "@/lib/portfolio";
import { useBrandsCatalog, parseEncodedBrand, type BrandRow } from "@/lib/catalog";
import {
  SIGNAL_TYPE_LABELS,
  groupByDate,
  useSignalsForBrands,
  type SignalCategory,
  type SignalRow,
  type SignalType,
} from "@/lib/signals";
import type { Category } from "@/lib/quiz";

const TYPE_OPTIONS: SignalType[] = ["price_increase", "new_collection", "discount", "drop"];
const CATEGORY_OPTIONS: SignalCategory[] = ["watches", "jewelry", "bags"];
const CATEGORY_LABEL: Record<SignalCategory, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

export const Route = createFileRoute("/_authenticated/app/signals")({
  // Search params are ignored for filter state (kept for backwards-compat links).
  validateSearch: () => ({}),
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

function normModel(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function buildCardData(
  signals: SignalRow[],
  portfolio: PortfolioRow[],
  watchlist: WatchlistRow[],
  catalog: BrandRow[],
): SignalCardData[] {
  const slugFor = (brand: string, category: Category) =>
    catalog.find((b) => b.name === brand && b.category === category)?.slug ?? null;

  const pfWithSlug = portfolio
    .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
    .filter((x) => x.slug != null) as Array<{ row: PortfolioRow; slug: string }>;

  const wlWithSlug = watchlist
    .map((r) => ({ row: r, slug: slugFor(r.brand, r.category) }))
    .filter((x) => x.slug != null) as Array<{ row: WatchlistRow; slug: string }>;

  return signals.map((s) => {
    const isBrandLevel = !s.model || s.model.trim() === "";
    const model = normModel(s.model);
    const pfMatches = pfWithSlug
      .filter((x) => x.slug === s.brand_slug)
      .filter((x) => (isBrandLevel ? true : normModel(x.row.model) === model))
      .map((x) => x.row);
    const wlMatches = wlWithSlug
      .filter((x) => x.slug === s.brand_slug)
      .filter((x) => {
        if (isBrandLevel) return true;
        if (x.row.type === "brand") return true;
        return normModel(x.row.model) === model;
      })
      .map((x) => x.row);
    return {
      signal: s,
      portfolioMatches: pfMatches,
      watchlistMatches: wlMatches,
      precision: isBrandLevel ? "brand" : "piece",
    };
  });
}

function SignalsPage() {
  const router = useRouter();

  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const catalogQ = useBrandsCatalog();

  const [typeFilters, setTypeFilters] = useState<Set<SignalType>>(new Set());
  const [catFilters, setCatFilters] = useState<Set<SignalCategory>>(new Set());
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set()); // brand_slug

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
      if (typeFilters.size > 0 && !typeFilters.has(r.type)) return false;
      if (catFilters.size > 0 && !catFilters.has(r.category)) return false;
      if (brandFilters.size > 0 && !brandFilters.has(r.brand_slug)) return false;
      return true;
    });
  }, [signalsQ.data, typeFilters, catFilters, brandFilters]);

  const cardData = useMemo(
    () => buildCardData(filteredSignals, pfQ.data ?? [], wlQ.data ?? [], catalogQ.data ?? []),
    [filteredSignals, pfQ.data, wlQ.data, catalogQ.data],
  );

  const groups = useMemo(() => {
    const byId = new Map(cardData.map((c) => [c.signal.id, c]));
    return groupByDate(filteredSignals).map((g) => ({
      ...g,
      items: g.items.map((s) => byId.get(s.id)!).filter(Boolean),
    }));
  }, [cardData, filteredSignals]);

  useEffect(() => {
    if (signalsQ.isSuccess) {
      track("signals_viewed", {
        followedCount: liveFollowedSlugs.length,
        resultCount: signalsQ.data?.length ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalsQ.isSuccess]);

  const brandOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of followedBrands) map.set(b.slug, b.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [followedBrands]);

  function toggleFrom<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const anyFilter = typeFilters.size + catFilters.size + brandFilters.size > 0;
  function clearFilters() {
    setTypeFilters(new Set());
    setCatFilters(new Set());
    setBrandFilters(new Set());
  }

  const isLoading =
    profileQ.isLoading || wlQ.isLoading || pfQ.isLoading || catalogQ.isLoading ||
    (liveFollowedSlugs.length > 0 && signalsQ.isLoading);

  return (
    <div>
      {liveFollowedSlugs.length > 0 ? (
        <div className="mt-2 mb-6 flex flex-wrap items-center gap-2">
          <MultiSelectDropdown
            label="Types"
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: SIGNAL_TYPE_LABELS[t] }))}
            selected={typeFilters as Set<string>}
            onToggle={(v) => toggleFrom(typeFilters, v as SignalType, setTypeFilters)}
            onAll={() => setTypeFilters(new Set())}
          />
          <MultiSelectDropdown
            label="Categories"
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            selected={catFilters as Set<string>}
            onToggle={(v) => toggleFrom(catFilters, v as SignalCategory, setCatFilters)}
            onAll={() => setCatFilters(new Set())}
          />
          <MultiSelectDropdown
            label="Brands"
            options={brandOptions.map(([slug, name]) => ({ value: slug, label: name }))}
            selected={brandFilters}
            onToggle={(v) => toggleFrom(brandFilters, v, setBrandFilters)}
            onAll={() => setBrandFilters(new Set())}
          />

          <div className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Clear filters"
                  onClick={clearFilters}
                  disabled={!anyFilter}
                  className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-background text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear filters</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Signals are estimates, not investment advice.</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Signals are estimates, not investment advice.</span>
        </div>
      )}

      {renderBody()}
    </div>
  );

  function renderBody() {
    if (profileQ.isError || wlQ.isError || pfQ.isError || catalogQ.isError || signalsQ.isError) {
      return (
        <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">
            We couldn't load signals
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Give it another try.</p>
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
          title="No signals match your filters"
          description="Try clearing filters to see everything for the brands you follow."
        />
      );
    }

    return (
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {g.label.toUpperCase()}
              </h2>
              <div className="h-px flex-1 bg-hairline" />
            </div>
            <div className="space-y-3">
              {g.items.map((item) => (
                <ImportantSignalCard key={item.signal.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
}

function MultiSelectDropdown({
  label, options, selected, onToggle, onAll,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: Set<string>;
  onToggle: (value: string) => void;
  onAll: () => void;
}) {
  const summary = useMemo(() => {
    if (selected.size === 0) return "All";
    const picked = options.filter((o) => selected.has(o.value));
    if (picked.length <= 2) return picked.map((p) => p.label).join(", ");
    return `${picked[0].label} +${picked.length - 1}`;
  }, [selected, options]);
  const allSelected = selected.size === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm hover:bg-surface-2 transition-colors"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5 max-h-[300px] overflow-y-auto">
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-surface-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => { if (!allSelected) onAll(); }}
          />
          <span className="font-medium">All</span>
        </label>
        {options.length > 0 ? <div className="my-1 h-px bg-hairline" /> : null}
        {options.map((o) => {
          const checked = selected.has(o.value);
          return (
            <label key={o.value} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-surface-2">
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(o.value)}
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
