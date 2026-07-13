import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellOff, ChevronDown, Info, RotateCcw } from "lucide-react";
import { format, subMonths } from "date-fns";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


import { EmptyState } from "@/components/app/EmptyState";
import emptyPortfolioAsset from "@/assets/empty-portfolio.png.asset.json";
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
import { useBrandsCatalog, type BrandRow } from "@/lib/catalog";
import {
  SIGNAL_TYPE_LABELS,
  useSignalsForBrands,
  dateLabel,
  type SignalCategory,
  type SignalRow,
  type SignalType,
} from "@/lib/signals";
import { sourceHostname, unmuteSource, useMutedSources } from "@/lib/muted-sources";
import type { Category } from "@/lib/quiz";

const TYPE_OPTIONS: SignalType[] = ["price_increase", "new_collection", "discount", "drop"];
const CATEGORY_OPTIONS: SignalCategory[] = ["watches", "jewelry", "bags"];
const CATEGORY_LABEL: Record<SignalCategory, string> = {
  watches: "Watches",
  jewelry: "Jewelry",
  bags: "Bags",
};

type AffectsFilter = "all" | "watchlist" | "portfolio";
const AFFECTS_OPTIONS: { value: AffectsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watchlist", label: "Brand watchlist" },
  { value: "portfolio", label: "Portfolio" },
];

type TimelinePeriod = "all" | "week" | "month" | "quarter" | "year" | "custom";
const TIMELINE_LABELS: Record<TimelinePeriod, string> = {
  all: "All time",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  custom: "Custom",
};
const TIMELINE_PRESETS: { value: Exclude<TimelinePeriod, "custom">; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

type TimelineValue = { period: TimelinePeriod; from?: Date; to?: Date };

function timelineStart(period: TimelinePeriod): Date | null {
  if (period === "all") return null;
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else if (period === "quarter") d.setMonth(d.getMonth() - 3);
  else if (period === "year") d.setFullYear(d.getFullYear() - 1);
  return d;
}

const signalsSearchSchema = z.object({
  affected: fallback(z.enum(["all", "watchlist", "portfolio"]), "all").default("all"),
  period: fallback(z.string(), "month").default("month"),
  from: fallback(z.string().optional(), undefined),
  to: fallback(z.string().optional(), undefined),
  brand: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/app/signals")({
  validateSearch: zodValidator(signalsSearchSchema),
  component: SignalsPage,
});

function resolveBrandSlugs(
  catalog: BrandRow[],
  watchlist: Array<{ brand: string; category: string; is_active: boolean }>,
): BrandRow[] {
  const seen = new Set<string>();
  const out: BrandRow[] = [];
  const push = (b: BrandRow | undefined) => {
    if (!b || seen.has(b.slug)) return;
    seen.add(b.slug);
    out.push(b);
  };
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
      .filter((x) => x.row.type === "piece")
      .filter((x) => (isBrandLevel ? true : normModel(x.row.model) === model))
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
  const search = Route.useSearch();

  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const catalogQ = useBrandsCatalog();

  const [typeFilters, setTypeFilters] = useState<Set<SignalType>>(new Set());
  const [catFilters, setCatFilters] = useState<Set<SignalCategory>>(new Set());
  const [brandFilters, setBrandFilters] = useState<Set<string>>(() => new Set(search.brand ? [search.brand] : [])); // brand_slug
  const [affectsFilter, setAffectsFilter] = useState<AffectsFilter>(search.affected);
  const [timeline, setTimeline] = useState<TimelineValue>(() => {
    const p = (search.period as TimelinePeriod) ?? "month";
    const from = search.from ? new Date(search.from) : undefined;
    const to = search.to ? new Date(search.to) : undefined;
    return { period: p, from, to };
  });

  const watchlist = wlQ.data ?? [];

  const followedBrands = useMemo(() => {
    if (!catalogQ.data) return [];
    return resolveBrandSlugs(catalogQ.data, watchlist);
  }, [watchlist, catalogQ.data]);

  const liveFollowedSlugs = useMemo(
    () => followedBrands.map((b) => b.slug),
    [followedBrands],
  );

  const signalsQ = useSignalsForBrands(liveFollowedSlugs);

  const allCardData = useMemo(
    () => buildCardData(signalsQ.data ?? [], pfQ.data ?? [], wlQ.data ?? [], catalogQ.data ?? []),
    [signalsQ.data, pfQ.data, wlQ.data, catalogQ.data],
  );

  const mutedSources = useMutedSources();
  const mutedSet = useMemo(() => new Set(mutedSources), [mutedSources]);

  // Split muted-source cards out of the main flow. Users can un-mute from the
  // banner or from Settings; we don't spam them with alerts they silenced.
  const { visibleCardData, hiddenBySource } = useMemo(() => {
    const visible: SignalCardData[] = [];
    const hidden = new Map<string, number>();
    for (const c of allCardData) {
      const host = sourceHostname(c.signal.source_url);
      if (host && mutedSet.has(host)) {
        hidden.set(host, (hidden.get(host) ?? 0) + 1);
      } else {
        visible.push(c);
      }
    }
    return { visibleCardData: visible, hiddenBySource: hidden };
  }, [allCardData, mutedSet]);

  const filteredCardData = useMemo(() => {
    const startTs =
      timeline.period === "custom"
        ? timeline.from?.getTime() ?? null
        : timelineStart(timeline.period)?.getTime() ?? null;
    const endTs =
      timeline.period === "custom" && timeline.to
        ? new Date(timeline.to).setHours(23, 59, 59, 999)
        : null;
    return visibleCardData.filter((c) => {
      if (typeFilters.size > 0 && !typeFilters.has(c.signal.type)) return false;
      if (catFilters.size > 0 && !catFilters.has(c.signal.category)) return false;
      if (brandFilters.size > 0 && !brandFilters.has(c.signal.brand_slug)) return false;
      if (affectsFilter === "watchlist" && c.watchlistMatches.length === 0) return false;
      if (affectsFilter === "portfolio" && c.portfolioMatches.length === 0) return false;
      const ts = new Date(c.signal.signal_date).getTime();
      if (startTs != null && ts < startTs) return false;
      if (endTs != null && ts > endTs) return false;
      return true;
    });
  }, [visibleCardData, typeFilters, catFilters, brandFilters, affectsFilter, timeline]);



  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredCardData.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [typeFilters, catFilters, brandFilters, affectsFilter, timeline]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedCardData = useMemo(
    () => filteredCardData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredCardData, page],
  );

  const groups = useMemo(() => {
    const buckets = new Map<string, SignalCardData[]>();
    for (const c of pagedCardData) {
      const d = new Date(c.signal.signal_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(c);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()]
      .map(([key, items]) => ({
        key,
        label: dateLabel(new Date(items[0].signal.signal_date)),
        items,
        sortAt: new Date(items[0].signal.signal_date).getTime(),
      }))
      .sort((a, b) => b.sortAt - a.sortAt)
      .map(({ key, label, items }) => ({ key, label, items }));
  }, [pagedCardData]);

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

  const anyFilter =
    typeFilters.size + catFilters.size + brandFilters.size > 0 ||
    affectsFilter !== "all" ||
    timeline.period !== "month";
  function clearFilters() {
    setTypeFilters(new Set());
    setCatFilters(new Set());
    setBrandFilters(new Set());
    setAffectsFilter("all");
    setTimeline({ period: "month" });
  }


  const isLoading =
    profileQ.isLoading || wlQ.isLoading || pfQ.isLoading || catalogQ.isLoading ||
    (liveFollowedSlugs.length > 0 && signalsQ.isLoading);

  return (
    <div>
      {liveFollowedSlugs.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <SingleSelectDropdown
            label="Affects"
            options={AFFECTS_OPTIONS}
            value={affectsFilter}
            onChange={(v) => setAffectsFilter(v)}
          />
          <TimelineDropdown value={timeline} onChange={setTimeline} />


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
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="mb-4 mt-3 flex items-center gap-2 rounded-xl px-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Price alerts are estimates, not investment advice.</span>
        </div>
      )}

      {hiddenBySource.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs text-muted-foreground">
          <BellOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            Hiding {[...hiddenBySource.values()].reduce((a, b) => a + b, 0)} alert
            {[...hiddenBySource.values()].reduce((a, b) => a + b, 0) === 1 ? "" : "s"} from muted source
            {hiddenBySource.size === 1 ? "" : "s"}:
          </span>
          {[...hiddenBySource.entries()].map(([host, count]) => (
            <button
              key={host}
              type="button"
              onClick={() => {
                unmuteSource(host);
                track("signal_source_unmuted", { host, via: "banner" });
              }}
              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-surface-2 transition-colors"
              aria-label={`Unmute ${host}`}
            >
              {host} <span className="text-muted-foreground">({count})</span>
              <span className="text-muted-foreground ml-0.5">×</span>
            </button>
          ))}
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
            We couldn't load price alerts
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Give it another try.</p>
          <Button className="mt-4" onClick={() => router.invalidate()}>Retry</Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    if (watchlist.length === 0) {
      return (
        <div className="mt-16 flex flex-col items-center text-center">
          <img
            src={emptyPortfolioAsset.url}
            alt="Empty price alerts"
            className="h-24 w-auto opacity-90"
          />
          <h2 className="mt-6 font-display text-xl font-semibold tracking-tight text-foreground">
            Nothing on your radar yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Follow a brand or a specific piece. We'll ping you on new drops, price rises, and drops — nothing else.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => router.navigate({ to: "/app/watchlist" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Add a brand
            </button>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/app/watchlist" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-5 py-2.5 font-display text-sm font-semibold text-foreground hover:bg-surface-2 transition-colors"
            >
              Add a piece
            </button>
          </div>
        </div>
      );
    }

    if (filteredCardData.length === 0) {
      return (
        <EmptyState
          title="No price alerts match your filters"
          description="Try clearing filters to see everything for the brands you follow."
          action={
            <Button variant="outline" onClick={clearFilters} className="rounded-full">
              Clear filters
            </Button>
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-2 flex items-center gap-3 px-1">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {g.label.toUpperCase()}
              </h2>
              <div className="h-px flex-1 bg-hairline" />
            </div>
            <div className="space-y-2">
              {g.items.map((item) => (
                <ImportantSignalCard key={item.signal.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredCardData.length}
            pageSize={PAGE_SIZE}
            onChange={(p) => {
              setPage(p);
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
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

function SingleSelectDropdown<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm hover:bg-surface-2 transition-colors"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{selectedLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5 max-h-[300px] overflow-y-auto">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-surface-2"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function TimelineDropdown({
  value,
  onChange,
}: {
  value: TimelineValue;
  onChange: (v: TimelineValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });
  const [month, setMonth] = useState<Date>(subMonths(new Date(), 1));

  useEffect(() => {
    if (open) {
      setDraft({ from: value.from, to: value.to });
      setMonth(subMonths(new Date(), 1));
    }
  }, [open, value.from, value.to]);

  const summary = useMemo(() => {
    if (value.period === "custom" && value.from && value.to) {
      return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`;
    }
    return TIMELINE_LABELS[value.period];
  }, [value]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm hover:bg-surface-2 transition-colors"
        >
          <span className="text-muted-foreground">Timeline</span>
          <span className="font-semibold text-foreground">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden border border-hairline bg-white p-0"
      >
        <div className="p-1.5">
          <div className="flex flex-wrap gap-1.5">
            {TIMELINE_PRESETS.map((p) => {
              const active = value.period === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onChange({ period: p.value });
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-surface-2",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-hairline">
          <Calendar
            mode="range"
            selected={{ from: draft.from, to: draft.to }}
            onSelect={(r) => setDraft({ from: r?.from, to: r?.to })}
            numberOfMonths={2}
            month={month}
            onMonthChange={setMonth}
            disabled={{ after: new Date() }}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="flex items-center justify-end gap-2 border-t border-hairline p-2">
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-display font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft.from || !draft.to}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-display font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => {
                if (draft.from && draft.to) {
                  onChange({ period: "custom", from: draft.from, to: draft.to });
                  setOpen(false);
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => {
    if (pages[pages.length - 1] !== n) pages.push(n);
  };
  push(1);
  for (let i = page - 1; i <= page + 1; i++) {
    if (i > 1 && i < totalPages) {
      const last = pages[pages.length - 1];
      if (typeof last === "number" && i > last + 1) push("…");
      push(i);
    }
  }
  if (totalPages > 1) {
    const last = pages[pages.length - 1];
    if (typeof last === "number" && last < totalPages - 1) push("…");
    push(totalPages);
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-2" aria-label="Price alerts pagination">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-full border border-hairline bg-background px-3 py-1.5 text-sm font-display hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "grid h-8 min-w-8 place-items-center rounded-full border px-2 text-sm font-display transition-colors",
                p === page
                  ? "border-foreground bg-foreground text-background"
                  : "border-hairline bg-background text-foreground hover:bg-surface-2",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-full border border-hairline bg-background px-3 py-1.5 text-sm font-display hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </nav>
  );
}


