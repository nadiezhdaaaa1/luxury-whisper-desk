import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ChevronDown, Plus, RotateCcw,
  Sparkles, Watch, Gem, ShoppingBag, CheckSquare, Trash2, X,
} from "lucide-react";



import { EmptyState } from "@/components/app/EmptyState";
import { ApproachingLimitBanner } from "@/components/app/ApproachingLimitBanner";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { fetchWatchlist, insertItems as insertWatchlistItems, activeCapFor } from "@/lib/watchlist";
import { PortfolioBreakdown } from "@/components/portfolio/PortfolioBreakdown";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { AddEditPortfolioModal } from "@/components/portfolio/AddEditPortfolioModal";
import { TIERS, TIER_LABELS, useBrandsCatalog, type Tier } from "@/lib/catalog";
import { resolveBrandSlug } from "@/lib/signals";
import { readOnlyPortfolioIds, splitPortfolioByPlan } from "@/lib/subscription";
import emptyPortfolioAsset from "@/assets/empty-portfolio.png.asset.json";

const portfolioSearchSchema = z.object({
  category: z.enum(["watches", "jewelry", "bags"]).optional(),
});

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: PortfolioPage,
  validateSearch: (search) => portfolioSearchSchema.parse(search),
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

type RemoveReason = "sold" | "gifted" | "returned" | "lost_stolen" | "no_longer_own" | "mistake" | "other";
const REMOVE_REASONS: { value: RemoveReason; label: string; hint?: string }[] = [
  { value: "sold", label: "Sold it", hint: "Cashed out — we'll keep tracking market prices for you." },
  { value: "gifted", label: "Gifted it" },
  { value: "returned", label: "Returned to seller" },
  { value: "lost_stolen", label: "Lost or stolen" },
  { value: "no_longer_own", label: "No longer own it" },
  { value: "mistake", label: "Added by mistake / duplicate" },
  { value: "other", label: "Other" },
];

function PortfolioPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const [catFilters, setCatFilters] = useState<Set<Category>>(() =>
    search.category ? new Set([search.category as Category]) : new Set(),
  );
  const [tierFilters, setTierFilters] = useState<Set<Tier>>(new Set());
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<PortfolioRow | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState<RemoveReason | "">("");
  const [removeNote, setRemoveNote] = useState("");
  const [removing, setRemoving] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [bulkRemoveReason, setBulkRemoveReason] = useState<RemoveReason | "">("");
  const [bulkRemoveNote, setBulkRemoveNote] = useState("");
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [signalPrompt, setSignalPrompt] = useState<{ brand: string; category: Category } | null>(null);
  const [enablingSignal, setEnablingSignal] = useState(false);


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
    let justAdded = false;
    try {
      if (editRow) {
        await updatePortfolioItem(editRow.id, input);
        track("portfolio_item_edited", { id: editRow.id, brand: input.brand });
      } else {
        const inserted = await insertPortfolioItem(input);
        justAdded = true;
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
      toast.success(justAdded ? `${input.brand} added to your portfolio` : "Piece updated");

      if (justAdded) {
        const wl = wlQ.data ?? (await fetchWatchlist());
        const alreadyFollowed = wl.some(
          (w) =>
            w.type === "brand" &&
            w.brand === input.brand &&
            w.category === input.category &&
            w.is_active,
        );
        if (!alreadyFollowed) {
          setSignalPrompt({ brand: input.brand, category: input.category });
        }
      }
    } catch (e) {
      console.error("[portfolio] save failed", e);
      toast.error("Couldn't save. Please try again.");
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  async function enableSignalForPrompt() {
    if (!signalPrompt) return;
    // Cap check: free plan can't exceed the active brand watchlist cap.
    const wl = wlQ.data ?? (await fetchWatchlist());
    const activeCount = wl.filter((w) => w.is_active).length;
    const cap = activeCapFor(profileQ.data?.plan);
    if (activeCount >= cap) {
      setSignalPrompt(null);
      setUpsellOpen(true);
      toast.info("You've hit your brand watchlist limit — upgrade to keep tracking more.");
      return;
    }
    setEnablingSignal(true);
    try {
      await insertWatchlistItems([
        { type: "brand", category: signalPrompt.category, brand: signalPrompt.brand, is_active: true },
      ]);
      track("signal_enabled_from_portfolio", {
        brand: signalPrompt.brand,
        category: signalPrompt.category,
      });
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
      setSignalPrompt(null);
      toast.success(`Now tracking ${signalPrompt.brand}`);
    } catch (e) {
      console.error("[portfolio] enable signal failed", e);
      toast.error("Couldn't enable tracking. Try again.");
    } finally {
      setEnablingSignal(false);
    }
  }



  function openRemoveDialog(id: string) {
    setConfirmRemoveId(id);
    setRemoveReason("");
    setRemoveNote("");
  }

  async function handleRemove(id: string) {
    if (!removeReason) return;
    const row = rows.find((r) => r.id === id);
    setRemoving(true);
    try {
      await deletePortfolioItem(id);
      track("portfolio_item_removed", {
        id,
        brand: row?.brand,
        reason: removeReason,
        note: removeNote.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["portfolio"] });
      setConfirmRemoveId(null);
      const reasonUsed = removeReason;
      const removedRow = row;
      setRemoveReason("");
      setRemoveNote("");

      // Offer to keep following the brand when the user parted with it.
      const suggestKeep =
        removedRow &&
        (reasonUsed === "sold" || reasonUsed === "gifted" || reasonUsed === "no_longer_own");
      if (suggestKeep) {
        const wl = wlQ.data ?? (await fetchWatchlist());
        const alreadyFollowed = wl.some(
          (w) =>
            w.type === "brand" &&
            w.brand === removedRow.brand &&
            w.category === removedRow.category &&
            w.is_active,
        );
        const activeCount = wl.filter((w) => w.is_active).length;
        const cap = activeCapFor(profileQ.data?.plan);
        if (!alreadyFollowed && activeCount < cap) {
          toast(`${removedRow.brand} removed`, {
            description: "Keep tracking prices and new drops for this brand?",
            action: {
              label: "Follow brand",
              onClick: async () => {
                try {
                  await insertWatchlistItems([
                    {
                      type: "brand",
                      category: removedRow.category,
                      brand: removedRow.brand,
                      is_active: true,
                    },
                  ]);
                  await qc.invalidateQueries({ queryKey: ["watchlist"] });
                  toast.success(`Now following ${removedRow.brand}`);
                  track("watchlist_brand_added_from_remove", {
                    brand: removedRow.brand,
                    category: removedRow.category,
                    reason: reasonUsed,
                  });
                } catch (err) {
                  console.error("[portfolio] follow-after-remove failed", err);
                  toast.error("Couldn't add to brand watchlist.");
                }
              },
            },
          });
        } else {
          toast.success(`${removedRow.brand} removed`);
        }
      } else {
        toast.success("Removed from portfolio");
      }
    } catch (e) {
      console.error("[portfolio] remove failed", e);
      toast.error("Couldn't remove. Try again.");
    } finally {
      setRemoving(false);
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

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function enterSelectMode(id?: string) {
    setSelectMode(true);
    if (id) setSelected(new Set([id]));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function openBulkRemoveDialog() {
    setBulkRemoveReason("");
    setBulkRemoveNote("");
    setBulkRemoveOpen(true);
  }

  async function handleBulkRemove() {
    const ids = [...selected];
    if (ids.length === 0 || !bulkRemoveReason) return;
    setBulkRemoving(true);
    try {
      await Promise.all(ids.map((id) => deletePortfolioItem(id)));
      track("portfolio_bulk_removed", {
        count: ids.length,
        reason: bulkRemoveReason,
        note: bulkRemoveNote.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["portfolio"] });
      setBulkRemoveOpen(false);
      setBulkRemoveReason("");
      setBulkRemoveNote("");
      exitSelectMode();
    } finally {
      setBulkRemoving(false);
    }
  }



  const loading = pfQ.isLoading || profileQ.isLoading;
  const errored = pfQ.isError;
  const anyFilter = catFilters.size + tierFilters.size + brandFilters.size > 0;

  return (
    <div>
      {loading ? (
        <>
          <Skeleton className="h-32 w-full rounded-2xl mb-6" />
          <div className="mt-6 mb-6 flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-20 rounded-full" />
            </div>
          </div>
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
        <div className="mt-16 flex flex-col items-center text-center">
          <img
            src={emptyPortfolioAsset.url}
            alt="Empty portfolio"
            className="h-24 w-auto opacity-90"
          />
          <h2 className="mt-6 font-display text-xl font-semibold tracking-tight text-foreground">
            Start tracking what you own
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add your first watch, bag, or piece of jewelry. We'll show its current value, price history, and alert you when the market moves.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add your first piece
          </button>
          {profileQ.data?.plan === "pro" ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Pro plan — track unlimited pieces across watches, bags, and jewelry.
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Free plan tracks up to {FREE_PORTFOLIO_CAP} pieces — no card required.
            </p>
          )}
        </div>
      ) : (
        <>
          <PortfolioBreakdown rows={activeRows} />

          {selectMode ? (
            <div className="sticky top-2 z-20 mb-4 flex items-center gap-2 rounded-full border border-hairline bg-background/95 backdrop-blur px-3 py-2 shadow-soft">
              <button
                type="button"
                onClick={exitSelectMode}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2"
                aria-label="Exit selection"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">
                {selected.size} selected
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = new Set<string>();
                    for (const r of activeFiltered) all.add(r.id);
                    for (const r of pausedFiltered) all.add(r.id);
                    setSelected(all);
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={openBulkRemoveDialog}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : null}

          {/* Filters + Add */}
          <div className="mt-6 mb-6 flex flex-wrap items-center gap-2">
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

            <div className="ml-auto flex items-center gap-2">
              {rows.length > 0 && !selectMode ? (
                <button
                  type="button"
                  onClick={() => enterSelectMode()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Select</span>
                </button>
              ) : null}
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

          {profileQ.data?.plan === "free" && (
            <ApproachingLimitBanner
              used={rows.length}
              cap={cap}
              itemLabel="portfolio items"
              from="portfolio"
            />
          )}

          {nothingMatches ? (
            <p className="text-sm text-muted-foreground italic mt-6">Nothing matches this filter.</p>
          ) : (
            <>
              {CAT_ORDER.map((cat) => {
                const list = groupedActive[cat];
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
                        void resolveBrandSlug(catalogQ.data, row.brand, row.category);
                        return (
                          <PortfolioCard
                            key={row.id}
                            row={row}
                            tier={tierFor(row)}
                            readOnly={readOnlyIds.has(row.id)}
                            onEdit={() => { setEditRow(row); setAddOpen(true); }}
                            onRemove={() => openRemoveDialog(row.id)}
                            selectable={selectMode}
                            selected={selected.has(row.id)}
                            onToggleSelect={() => toggleSelected(row.id)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {pausedRows.length > 0 ? (
                <div className="mb-6 overflow-hidden rounded-[12px] border border-primary">
                  <div className="bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
                    <span>Free accounts have a {FREE_PORTFOLIO_CAP}-item limit.</span>{" "}
                    <span className="opacity-80">Upgrade to keep tracking all of them.</span>{" "}
                    <a
                      href="/app/settings"
                      className="underline underline-offset-2 font-semibold"
                      onClick={() => track("upgrade_click", { from: "portfolio_cap" })}
                    >
                      Upgrade
                    </a>
                  </div>
                  <div className="p-4 sm:p-6">
                    {pausedFiltered.length > 0 ? (
                      <div className="mb-4 flex items-center gap-3">
                        <h2 className="font-display text-xl font-semibold tracking-tight">Paused</h2>
                        <span className="text-sm text-muted-foreground">{pausedFiltered.length}</span>
                      </div>
                    ) : null}

                    {CAT_ORDER.map((cat) => {
                      const list = groupedPaused[cat];
                      if (list.length === 0) return null;
                      const Icon = CAT_ICON[cat];
                      return (
                        <section key={`paused-${cat}`} className="mb-8 last:mb-0">
                          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <h2 className="font-display text-[12px] font-semibold uppercase tracking-widest">
                              {CATEGORY_LABELS[cat]}
                            </h2>
                            <span className="text-xs">{list.length}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {list.map((row) => (
                              <PortfolioCard
                                key={row.id}
                                row={row}
                                tier={tierFor(row)}
                                readOnly
                                onEdit={() => { setEditRow(row); setAddOpen(true); }}
                                onRemove={() => openRemoveDialog(row.id)}
                                selectable={selectMode}
                                selected={selected.has(row.id)}
                                onToggleSelect={() => toggleSelected(row.id)}
                              />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
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

      <Dialog
        open={!!confirmRemoveId}
        onOpenChange={(o) => {
          if (!o && !removing) {
            setConfirmRemoveId(null);
            setRemoveReason("");
            setRemoveNote("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Remove this piece?</DialogTitle>
            <DialogDescription>
              This can't be undone. Tell us why so we can improve your tracking — the
              photo will also be removed from your portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <RadioGroup
              value={removeReason}
              onValueChange={(v) => setRemoveReason(v as RemoveReason)}
              className="grid gap-2"
            >
              {REMOVE_REASONS.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`remove-reason-${r.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface p-3 hover:border-primary/40"
                >
                  <RadioGroupItem id={`remove-reason-${r.value}`} value={r.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    {r.hint ? (
                      <div className="text-xs text-muted-foreground">{r.hint}</div>
                    ) : null}
                  </div>
                </label>
              ))}
            </RadioGroup>

            {removeReason === "other" ? (
              <div className="mt-3">
                <Label htmlFor="remove-note" className="text-xs text-muted-foreground">
                  Tell us more (optional)
                </Label>
                <Textarea
                  id="remove-note"
                  value={removeNote}
                  onChange={(e) => setRemoveNote(e.target.value)}
                  placeholder="What happened?"
                  className="mt-1"
                  rows={3}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}
              disabled={!removeReason || removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkRemoveOpen}
        onOpenChange={(o) => {
          if (!o && !bulkRemoving) {
            setBulkRemoveOpen(false);
            setBulkRemoveReason("");
            setBulkRemoveNote("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>
              Remove {selected.size} {selected.size === 1 ? "piece" : "pieces"}?
            </DialogTitle>
            <DialogDescription>
              This can't be undone. Photos will also be removed. Pick the reason that
              best fits all selected pieces.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <RadioGroup
              value={bulkRemoveReason}
              onValueChange={(v) => setBulkRemoveReason(v as RemoveReason)}
              className="grid gap-2"
            >
              {REMOVE_REASONS.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`bulk-remove-reason-${r.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface p-3 hover:border-primary/40"
                >
                  <RadioGroupItem id={`bulk-remove-reason-${r.value}`} value={r.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    {r.hint ? (
                      <div className="text-xs text-muted-foreground">{r.hint}</div>
                    ) : null}
                  </div>
                </label>
              ))}
            </RadioGroup>

            {bulkRemoveReason === "other" ? (
              <div className="mt-3">
                <Label htmlFor="bulk-remove-note" className="text-xs text-muted-foreground">
                  Tell us more (optional)
                </Label>
                <Textarea
                  id="bulk-remove-note"
                  value={bulkRemoveNote}
                  onChange={(e) => setBulkRemoveNote(e.target.value)}
                  placeholder="What happened?"
                  className="mt-1"
                  rows={3}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setBulkRemoveOpen(false)}
              disabled={bulkRemoving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleBulkRemove()}
              disabled={!bulkRemoveReason || bulkRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkRemoving ? "Removing…" : `Remove ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <li>Unlimited brand watchlist tracking</li>
            <li>Priority price alerts when live pricing launches</li>
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
                window.location.assign("/app/settings");
              }}
            >
              Upgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!signalPrompt} onOpenChange={(o) => !o && !enablingSignal && setSignalPrompt(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Track {signalPrompt?.brand}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You're not following {signalPrompt?.brand} yet. Enable price alerts to get notified about price movements and new pieces from this brand.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setSignalPrompt(null)}
              disabled={enablingSignal}
              className="rounded-full font-display font-semibold px-6 h-11"
            >
              Not now
            </Button>
            <Button
              onClick={() => void enableSignalForPrompt()}
              disabled={enablingSignal}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11"
            >
              {enablingSignal ? "Enabling…" : "Enable price alerts"}
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
