import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ClipboardList, Plus, RotateCcw,
  Sparkles, Watch, Gem, ShoppingBag,
} from "lucide-react";

import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fetchMyProfile } from "@/lib/profile";
import { track } from "@/lib/analytics";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import {
  FREE_PORTFOLIO_CAP,
  deletePortfolioItem,
  fetchPortfolio,
  insertPortfolioItem,
  portfolioCapFor,
  updatePortfolioItem,
  type PortfolioInput,
  type PortfolioRow,
} from "@/lib/portfolio";
import { PortfolioBreakdown } from "@/components/portfolio/PortfolioBreakdown";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { AddEditPortfolioModal } from "@/components/portfolio/AddEditPortfolioModal";
import { TIERS, TIER_LABELS, useBrandsCatalog, type Tier } from "@/lib/catalog";
import { resolveBrandSlug } from "@/lib/signals";
import { readOnlyPortfolioIds, splitPortfolioByPlan } from "@/lib/subscription";

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: PortfolioPage,
});

const CAT_ORDER: Category[] = ["watches", "jewelry", "bags"];
const CAT_ICON: Record<Category, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};
const TIER_SHORT: Record<Tier, string> = {
  luxury_invest: "Luxury",
  mid_market: "Mid",
  mass_market: "Mass",
};

function PortfolioPage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const catalogQ = useBrandsCatalog();

  const [catFilters, setCatFilters] = useState<Set<Category>>(new Set());
  const [tierFilters, setTierFilters] = useState<Set<Tier>>(new Set());
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<PortfolioRow | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rows = pfQ.data ?? [];
  const cap = portfolioCapFor(profileQ.data?.plan);
  const readOnlyIds = useMemo(
    () => readOnlyPortfolioIds(rows, profileQ.data?.plan),
    [rows, profileQ.data?.plan],
  );

  // Tier for a given row from catalog.
  const tierFor = useMemo(() => {
    const brands = catalogQ.data ?? [];
    return (row: PortfolioRow): Tier | null => {
      const b = brands.find((x) => x.name === row.brand && x.category === row.category)
        ?? brands.find((x) => x.name === row.brand);
      return b?.tier ?? null;
    };
  }, [catalogQ.data]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.brand);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const { active: activeRows, paused: pausedRows } = useMemo(
    () => splitPortfolioByPlan(rows, profileQ.data?.plan),
    [rows, profileQ.data?.plan],
  );

  const applyFilters = (list: PortfolioRow[]) =>
    list.filter((r) => {
      if (catFilters.size > 0 && !catFilters.has(r.category)) return false;
      if (tierFilters.size > 0) {
        const t = tierFor(r);
        if (!t || !tierFilters.has(t)) return false;
      }
      if (brandFilters.size > 0 && !brandFilters.has(r.brand)) return false;
      return true;
    });

  const activeFiltered = useMemo(
    () => applyFilters(activeRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRows, catFilters, tierFilters, brandFilters, tierFor],
  );
  const pausedFiltered = useMemo(
    () => applyFilters(pausedRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pausedRows, catFilters, tierFilters, brandFilters, tierFor],
  );

  const groupBy = (list: PortfolioRow[]) => {
    const out: Record<Category, PortfolioRow[]> = { watches: [], jewelry: [], bags: [] };
    for (const r of list) out[r.category].push(r);
    return out;
  };
  const groupedActive = useMemo(() => groupBy(activeFiltered), [activeFiltered]);
  const groupedPaused = useMemo(() => groupBy(pausedFiltered), [pausedFiltered]);
  const nothingMatches = activeFiltered.length === 0 && pausedFiltered.length === 0;


  useEffect(() => {
    if (pfQ.data) track("portfolio_viewed", { count: pfQ.data.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfQ.data?.length]);

  const atCap = rows.length >= cap;

  function openAdd() {
    if (atCap) {
      track("portfolio_free_limit_reached", { count: rows.length });
      setUpsellOpen(true);
      return;
    }
    setEditRow(null);
    setAddOpen(true);
  }

  async function handleSubmit(input: PortfolioInput) {
    setSubmitting(true);
    try {
      if (editRow) {
        await updatePortfolioItem(editRow.id, input);
        track("portfolio_item_edited", { id: editRow.id, brand: input.brand });
      } else {
        const inserted = await insertPortfolioItem(input);
        track("portfolio_item_added", {
          id: inserted.id,
          category: input.category,
          brand: input.brand,
          has_price: input.purchase_price != null,
        });
      }
      if (input.signal_every_move || input.alert_below_enabled || input.alert_above_enabled) {
        track("portfolio_alert_set", {
          every_move: input.signal_every_move ?? false,
          below: input.alert_below_enabled ?? false,
          above: input.alert_above_enabled ?? false,
        });
      }
      await qc.invalidateQueries({ queryKey: ["portfolio"] });
      setAddOpen(false);
      setEditRow(null);
    } catch (e) {
      console.error("[portfolio] save failed", e);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    const row = rows.find((r) => r.id === id);
    try {
      await deletePortfolioItem(id);
      track("portfolio_item_removed", { id, brand: row?.brand });
      await qc.invalidateQueries({ queryKey: ["portfolio"] });
    } finally {
      setConfirmRemoveId(null);
    }
  }

  function clearFilters() {
    setCatFilters(new Set());
    setTierFilters(new Set());
    setBrandFilters(new Set());
  }

  function toggleFrom<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const loading = pfQ.isLoading || profileQ.isLoading;
  const errored = pfQ.isError;
  const anyFilter = catFilters.size + tierFilters.size + brandFilters.size > 0;

  return (
    <div>
      {/* Filter row + Add */}
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-2">
        <MultiSelectDropdown
          label="Categories"
          options={CAT_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          selected={catFilters as Set<string>}
          onToggle={(v) => toggleFrom(catFilters, v as Category, setCatFilters)}
          onAll={() => setCatFilters(new Set())}
        />
        <MultiSelectDropdown
          label="Grades"
          options={TIERS.map((t) => ({ value: t, label: TIER_SHORT[t] }))}
          selected={tierFilters as Set<string>}
          onToggle={(v) => toggleFrom(tierFilters, v as Tier, setTierFilters)}
          onAll={() => setTierFilters(new Set())}
        />
        <MultiSelectDropdown
          label="Brands"
          options={brandOptions.map((b) => ({ value: b, label: b }))}
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

        <div className="ml-auto">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton className="h-40 w-full rounded-2xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </>
      ) : errored ? (
        <EmptyState
          title="Couldn't load your portfolio"
          description="Please try again."
          action={<Button onClick={() => qc.invalidateQueries({ queryKey: ["portfolio"] })}>Retry</Button>}
        />
      ) : rows.length === 0 ? (
        <div className="mt-24 flex flex-col items-center text-center text-muted-foreground">
          <ClipboardList className="h-14 w-14 opacity-40" aria-hidden="true" />
          <p className="mt-4 italic">Waiting for you to add your first piece</p>
        </div>
      ) : (
        <>
          <PortfolioBreakdown rows={rows} />

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mt-6">Nothing matches this filter.</p>
          ) : (
            CAT_ORDER.map((cat) => {
              const list = grouped[cat];
              if (list.length === 0) return null;
              const Icon = CAT_ICON[cat];
              return (
                <section key={cat} className="mb-8">
                  <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <h2 className="font-display text-[12px] font-semibold uppercase tracking-widest">
                      {CATEGORY_LABELS[cat]}
                    </h2>
                    <span className="text-xs">{list.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {list.map((row) => {
                      // Resolve slug for future signal wiring; kept for parity.
                      void resolveBrandSlug(catalogQ.data, row.brand, row.category);
                      return (
                        <PortfolioCard
                          key={row.id}
                          row={row}
                          tier={tierFor(row)}
                          readOnly={readOnlyIds.has(row.id)}
                          onEdit={() => { setEditRow(row); setAddOpen(true); }}
                          onRemove={() => setConfirmRemoveId(row.id)}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}

      <AddEditPortfolioModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditRow(null); }}
        initial={editRow}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!confirmRemoveId} onOpenChange={(o) => !o && setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this piece?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. The photo will also be removed from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={upsellOpen} onOpenChange={setUpsellOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              You've reached the Free limit
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Free portfolios track up to {FREE_PORTFOLIO_CAP} items. Upgrade to Pro for:
          </p>
          <ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">
            <li>Unlimited portfolio pieces</li>
            <li>Unlimited watchlist tracking</li>
            <li>Priority price signals when live pricing launches</li>
          </ul>
          <p className="text-xs text-muted-foreground">Your existing items stay exactly where they are.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setUpsellOpen(false)}
              className="rounded-full font-display font-semibold px-6 h-11"
            >
              Not now
            </Button>
            <Button
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11"
              onClick={() => {
                track("upgrade_click", { from: "portfolio_cap" });
                setUpsellOpen(false);
                window.location.assign("/app/upgrade");
              }}
            >
              Upgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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

  // Suppress unused-var noise for TIER_LABELS import consumers elsewhere.
  void TIER_LABELS;

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
