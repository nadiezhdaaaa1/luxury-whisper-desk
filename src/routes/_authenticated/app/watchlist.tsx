import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight, ArrowUpRight,
  Check, CheckSquare, ChevronDown, MoreVertical, Plus, RotateCcw, Sparkles, Trash2, X,
  Watch, Gem, ShoppingBag,
} from "lucide-react";
import { getMockMarketPrice, getMockBrandTrend } from "@/lib/demo-market-prices";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { EmptyState } from "@/components/app/EmptyState";
import { ApproachingLimitBanner } from "@/components/app/ApproachingLimitBanner";
import emptyPortfolioAsset from "@/assets/empty-portfolio.png.asset.json";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyInput } from "@/components/ui/money-input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FREE_ACTIVE_CAP,
  activeCapFor,
  deleteItem,
  fetchWatchlist,
  insertItems,
  pickPromotion,
  planSeedFromProfile,
  updateItem,
  type WatchlistRow,
} from "@/lib/watchlist";
import { useBrandsCatalog, type Tier } from "@/lib/catalog";
import { resolveBrandSlug } from "@/lib/signals";
import { AddBrandModal } from "@/components/watchlist/AddBrandModal";
import { AddPieceModal } from "@/components/watchlist/AddPieceModal";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  component: WatchlistPage,
});


const CAT_ICONS: Record<Category, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

const TIER_SHORT: Record<Tier, string> = {
  luxury_invest: "Luxury",
  mid_market: "Mid",
  mass_market: "Mass",
};
const TIER_BADGE: Record<Tier, string> = {
  luxury_invest: "LUXURY",
  mid_market: "MID-MARKET",
  mass_market: "MASS-MARKET",
};
const CAT_ORDER: Category[] = ["watches", "jewelry", "bags"];
const TIER_ORDER: Tier[] = ["luxury_invest", "mid_market", "mass_market"];

function WatchlistPage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const activeCap = activeCapFor(profileQ.data?.plan);
  const isFree = profileQ.data?.plan !== "pro";
  const [seededOnce, setSeededOnce] = useState(false);
  const [catFilters, setCatFilters] = useState<Set<Category>>(new Set());
  const [tierFilters, setTierFilters] = useState<Set<Tier>>(new Set());
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<WatchlistRow | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [targetSaving, setTargetSaving] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSelectRemoveOpen, setBulkSelectRemoveOpen] = useState(false);
  const [bulkSelectRemoving, setBulkSelectRemoving] = useState(false);

  // Seed once from the profile brands if the watchlist is empty.
  useEffect(() => {
    if (seededOnce) return;
    if (!profileQ.data || !wlQ.data || !catalogQ.data) return;
    if (wlQ.data.length > 0) { setSeededOnce(true); return; }
    const brands = profileQ.data.brands;
    const cats = profileQ.data.categories;
    if (!Array.isArray(brands) || brands.length === 0) { setSeededOnce(true); return; }
    setSeededOnce(true);
    const plan = planSeedFromProfile(brands, cats, FREE_ACTIVE_CAP, catalogQ.data);
    if (plan.length === 0) return;
    (async () => {
      try {
        await insertItems(plan);
        await qc.invalidateQueries({ queryKey: ["watchlist"] });
      } catch (e) {
        console.error("[watchlist] seed failed", e);
      }
    })();
  }, [profileQ.data, wlQ.data, catalogQ.data, seededOnce, qc]);

  useEffect(() => {
    if (wlQ.data) track("watchlist_viewed", { count: wlQ.data.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wlQ.data?.length]);

  // Backfill: if the free cap has room, auto-promote oldest paused items to fill it.
  // Handles legacy state from when FREE_ACTIVE_CAP was lower than today.
  const [rebalancedOnce, setRebalancedOnce] = useState(false);
  useEffect(() => {
    if (rebalancedOnce) return;
    if (!wlQ.data || !profileQ.data) return;
    if (!Number.isFinite(activeCap)) { setRebalancedOnce(true); return; }
    const active = wlQ.data.filter((r) => r.is_active).length;
    const need = Math.max(0, activeCap - active);
    if (need === 0) { setRebalancedOnce(true); return; }
    const paused = wlQ.data
      .filter((r) => !r.is_active)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, need);
    if (paused.length === 0) { setRebalancedOnce(true); return; }
    setRebalancedOnce(true);
    (async () => {
      try {
        for (const p of paused) await updateItem(p.id, { is_active: true });
        await qc.invalidateQueries({ queryKey: ["watchlist"] });
      } catch (e) {
        console.error("[watchlist] rebalance failed", e);
      }
    })();
  }, [wlQ.data, profileQ.data, activeCap, rebalancedOnce, qc]);

  const rows = wlQ.data ?? [];

  const tierFor = (row: WatchlistRow): Tier | null => {
    const hit = catalogQ.data?.find((b) => b.name === row.brand && b.category === row.category);
    return hit?.tier ?? null;
  };

  // (No last-signal lookup on cards — moved to the "View signals" menu action.)


  const inFilter = (r: WatchlistRow) => {
    if (catFilters.size > 0 && catFilters.size < CAT_ORDER.length && !catFilters.has(r.category)) return false;
    if (tierFilters.size > 0 && tierFilters.size < TIER_ORDER.length) {
      const t = tierFor(r);
      if (!t || !tierFilters.has(t)) return false;
    }
    return true;
  };


  const activeRows = rows.filter((r) => r.is_active);
  const pausedRows = rows.filter((r) => !r.is_active);
  const activeFiltered = activeRows.filter(inFilter);
  const pausedFiltered = pausedRows.filter(inFilter);
  const filteredAll = [...activeFiltered, ...pausedFiltered];

  const overCap = isFree && rows.length > activeCap;

  const filterScopeLabel = useMemo(() => {
    if (catFilters.size === 0 && tierFilters.size === 0) return "";
    const parts: string[] = [];
    if (tierFilters.size > 0) parts.push([...tierFilters].map((t) => TIER_SHORT[t]).join("/"));
    if (catFilters.size > 0) parts.push([...catFilters].map((c) => CATEGORY_LABELS[c]).join("/"));
    return parts.join(" ");
  }, [catFilters, tierFilters]);

  function emitFilterChanged(cats: Set<Category>, tiers: Set<Tier>) {
    track("watchlist_filter_changed", {
      categories: [...cats],
      grades: [...tiers],
    });
  }
  function toggleCat(c: Category) {
    setCatFilters((prev) => {
      let next: Set<Category>;
      if (prev.size === 0) {
        next = new Set<Category>([c]);
      } else if (prev.has(c)) {
        const n = new Set(prev);
        n.delete(c);
        next = n.size === 0 ? new Set<Category>() : n;
      } else {
        next = new Set(prev);
        next.add(c);
      }
      emitFilterChanged(next, tierFilters);
      return next;
    });
  }
  function toggleTier(t: Tier) {
    setTierFilters((prev) => {
      let next: Set<Tier>;
      if (prev.size === 0) {
        next = new Set<Tier>([t]);
      } else if (prev.has(t)) {
        const n = new Set(prev);
        n.delete(t);
        next = n.size === 0 ? new Set<Tier>() : n;
      } else {
        next = new Set(prev);
        next.add(t);
      }
      emitFilterChanged(catFilters, next);
      return next;
    });
  }
  function setAllCats() {
    const next = new Set<Category>();
    setCatFilters(next);
    emitFilterChanged(next, tierFilters);
  }
  function setAllTiers() {
    const next = new Set<Tier>();
    setTierFilters(next);
    emitFilterChanged(catFilters, next);
  }


  async function handleRemove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const wasActive = row.is_active;
    try {
      await deleteItem(id);
      track("watchlist_item_removed", { type: row.type, category: row.category, brand: row.brand });
      if (wasActive) {
        const remaining = rows.filter((r) => r.id !== id);
        const promote = pickPromotion(remaining, activeCap);
        if (promote) await updateItem(promote.id, { is_active: true });
      }
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setConfirmRemoveId(null);
    }
  }

  async function handleRemoveFiltered() {
    const ids = filteredAll.map((r) => r.id);
    if (ids.length === 0) return;
    track("watchlist_remove_filtered_confirmed", {
      categories: [...catFilters], grades: [...tierFilters], count: ids.length,
    });
    try {
      await Promise.all(ids.map((id) => deleteItem(id)));
      // Auto-promote paused items to fill freed active slots.
      const remaining = rows.filter((r) => !ids.includes(r.id));
      const activeCount = remaining.filter((r) => r.is_active).length;
      const need = Math.max(0, activeCap - activeCount);
      const paused = remaining
        .filter((r) => !r.is_active)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (let i = 0; i < need && i < paused.length; i++) {
        await updateItem(paused[i].id, { is_active: true });
      }
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setConfirmBulkOpen(false);
    }
  }

  function openAddOrLimit(action: "brand" | "piece") {
    if (isFree && activeRows.length >= activeCap) {
      track("watchlist_free_limit_reached", { attempted: 1 });
      setUpsellOpen(true);
      return;
    }
    if (action === "brand") setAddBrandOpen(true);
    else setAddPieceOpen(true);
  }

  async function handleAddBrands(picks: Array<{ category: Category; brand: string }>) {
    if (picks.length === 0) return;
    if (isFree && activeRows.length + picks.length > activeCap) {
      track("watchlist_free_limit_reached", { attempted: picks.length });
      setUpsellOpen(true);
      return;
    }
    const rowsToInsert = picks.map((p) => ({
      type: "brand" as const,
      category: p.category,
      brand: p.brand,
      is_active: true,
    }));
    await insertItems(rowsToInsert);
    picks.forEach((p) => track("watchlist_brand_added", { category: p.category, brand: p.brand }));
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  async function handleAddPiece(pick: { category: Category; brand: string; model: string; target_price: number | null }) {
    if (isFree && activeRows.length >= activeCap) {
      track("watchlist_free_limit_reached", { attempted: 1 });
      setUpsellOpen(true);
      return;
    }
    await insertItems([{
      type: "piece",
      category: pick.category,
      brand: pick.brand,
      model: pick.model,
      target_price: pick.target_price,
      is_active: true,
    }]);
    track("watchlist_piece_added", { category: pick.category, brand: pick.brand, model: pick.model });
    if (pick.target_price != null) {
      track("watchlist_target_set", { brand: pick.brand, model: pick.model, target: pick.target_price });
    }
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  function validateTargetValue(s: string): { value: number | null; error: string | null } {
    const t = s.trim();
    if (t === "") return { value: null, error: null };
    const n = Number(t);
    if (!Number.isFinite(n)) return { value: null, error: "Enter a valid number." };
    if (n < 0) return { value: null, error: "Price can't be negative." };
    if (n === 0) return { value: null, error: "Set a target above 0." };
    return { value: n, error: null };
  }

  async function handleSaveTarget() {
    if (!targetItem) return;
    const { value, error } = validateTargetValue(targetValue);
    if (error) { setTargetError(error); return; }
    setTargetError(null);
    setTargetSaving(true);
    try {
      await updateItem(targetItem.id, { target_price: value });
      if (value != null) {
        track("watchlist_target_set", { brand: targetItem.brand, model: targetItem.model, target: value });
      }
      setTargetItem(null);
      setTargetValue("");
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setTargetSaving(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }
  async function handleBulkSelectRemove() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkSelectRemoving(true);
    try {
      await Promise.all(ids.map((id) => deleteItem(id)));
      // Auto-promote paused items into freed active slots
      const remaining = rows.filter((r) => !ids.includes(r.id));
      const activeCount = remaining.filter((r) => r.is_active).length;
      const need = Math.max(0, activeCap - activeCount);
      const paused = remaining
        .filter((r) => !r.is_active)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (let i = 0; i < need && i < paused.length; i++) {
        await updateItem(paused[i].id, { is_active: true });
      }
      track("watchlist_bulk_removed", { count: ids.length });
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
      setBulkSelectRemoveOpen(false);
      exitSelectMode();
    } finally {
      setBulkSelectRemoving(false);
    }
  }


  const followedByCategory: Record<Category, Set<string>> = useMemo(() => {
    const out = { watches: new Set<string>(), jewelry: new Set<string>(), bags: new Set<string>() };
    for (const r of rows) if (r.type === "brand") out[r.category].add(r.brand);
    return out;
  }, [rows]);

  const loading = wlQ.isLoading || profileQ.isLoading;
  const errored = wlQ.isError;

  const scopeSentence = filterScopeLabel
    ? `This will remove all ${filteredAll.length} ${filterScopeLabel} items. This can't be undone.`
    : `This will remove all ${filteredAll.length} items from your watchlist. This can't be undone.`;

  return (
    <div>
      {/* Filter row */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <MultiSelectDropdown
          label="Categories"
          options={CAT_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          selected={catFilters}
          onToggle={(v) => toggleCat(v as Category)}
          onAll={() => setAllCats()}
        />
        <MultiSelectDropdown
          label="Grades"
          options={TIER_ORDER.map((t) => ({ value: t, label: TIER_SHORT[t] }))}
          selected={tierFilters}
          onToggle={(v) => toggleTier(v as Tier)}
          onAll={() => setAllTiers()}

        />

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />

        {/* Icon actions */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Clear filters"
                onClick={() => {
                  setCatFilters(new Set());
                  setTierFilters(new Set());
                  emitFilterChanged(new Set(), new Set());
                  track("watchlist_filters_cleared");
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-background text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear filters</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Remove filtered from watchlist"
                disabled={filteredAll.length === 0}
                onClick={() => {
                  track("watchlist_remove_filtered_clicked", {
                    categories: [...catFilters],
                    grades: [...tierFilters],
                    count: filteredAll.length,
                  });
                  setConfirmBulkOpen(true);
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-background text-destructive hover:bg-destructive/5 disabled:text-muted-foreground/40 disabled:hover:bg-background disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove filtered from watchlist</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-auto flex items-center gap-2">
          {rows.length > 0 && !selectMode ? (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 font-display text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Select</span>
            </button>
          ) : null}
          <AddMenu onAddBrand={() => openAddOrLimit("brand")} onAddPiece={() => openAddOrLimit("piece")} />
        </div>
      </div>

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
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const all = new Set<string>();
                for (const r of filteredAll) all.add(r.id);
                setSelected(all);
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setBulkSelectRemoveOpen(true)}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : null}




      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="card-flat h-40" />
          ))}
        </div>

      ) : errored ? (
        <EmptyState
          title="Couldn't load your watchlist"
          description="Please try again."
          action={<Button onClick={() => qc.invalidateQueries({ queryKey: ["watchlist"] })}>Retry</Button>}
        />
      ) : rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <img
            src={emptyPortfolioAsset.url}
            alt="Empty watchlist"
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
              onClick={() => openAddOrLimit("brand")}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Add a brand
            </button>
            <button
              type="button"
              onClick={() => openAddOrLimit("piece")}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-5 py-2.5 font-display text-sm font-semibold text-foreground hover:bg-surface-2 transition-colors"
            >
              Add a specific piece
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free plan tracks up to {FREE_ACTIVE_CAP} items — no card required.
          </p>
        </div>
      ) : (
        <>
          {isFree && (
            <ApproachingLimitBanner
              used={activeRows.length}
              cap={activeCap}
              itemLabel="watchlist items"
              from="watchlist"
            />
          )}
          <CategoryGroups rows={activeFiltered} tierFor={tierFor}
            onRemove={(id) => setConfirmRemoveId(id)}
            onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); setTargetError(null); }}
            onViewSignals={(row) => {
              const slug = resolveBrandSlug(catalogQ.data, row.brand, row.category);
              if (slug) window.location.assign(`/app/signals?brand=${encodeURIComponent(slug)}`);
              else window.location.assign(`/app/signals`);
            }}
            selectable={selectMode} selectedIds={selected} onToggleSelect={toggleSelected} />


          {pausedFiltered.length > 0 ? (
            <div className="mb-6 overflow-hidden rounded-[12px] border border-primary">
              {overCap ? (
                <div className="bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
                  <span>Free accounts have a {FREE_ACTIVE_CAP} watchlist-item limit.</span>{" "}
                  <span className="opacity-80">Upgrade to keep tracking all of them.</span>{" "}
                  <a
                    href="/app/settings"
                    className="underline underline-offset-2 font-semibold"
                    onClick={() => track("upgrade_click", { from: "watchlist_cap" })}
                  >
                    Upgrade
                  </a>
                </div>
              ) : null}
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-display text-xl font-semibold tracking-tight">Paused</h2>
                  <span className="text-sm text-muted-foreground">{pausedFiltered.length}</span>
                </div>
                <CategoryGroups rows={pausedFiltered} tierFor={tierFor} isPaused
                  onRemove={(id) => setConfirmRemoveId(id)}
                  onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); setTargetError(null); }}
                  onViewSignals={(row) => {
                    const slug = resolveBrandSlug(catalogQ.data, row.brand, row.category);
                    if (slug) window.location.assign(`/app/signals?brand=${encodeURIComponent(slug)}`);
                    else window.location.assign(`/app/signals`);
                  }}
                  selectable={selectMode} selectedIds={selected} onToggleSelect={toggleSelected} />

              </div>
            </div>
          ) : null}

          {activeFiltered.length === 0 && pausedFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mt-6">Nothing matches this filter.</p>
          ) : null}
        </>
      )}

      <AddBrandModal open={addBrandOpen} onOpenChange={setAddBrandOpen}
        followedByCategory={followedByCategory} onConfirm={handleAddBrands} />
      <AddPieceModal open={addPieceOpen} onOpenChange={setAddPieceOpen} onConfirm={handleAddPiece} />

      {/* Single-item remove */}
      <AlertDialog open={!!confirmRemoveId} onOpenChange={(o) => !o && setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. Removing an active item promotes the next paused one into its place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-hairline bg-background font-display font-semibold px-6 h-11 hover:bg-surface-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display font-semibold px-6 h-11"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk remove */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={(o) => {
        if (!o) {
          if (confirmBulkOpen) track("watchlist_remove_filtered_canceled", { categories: [...catFilters], grades: [...tierFilters] });
          setConfirmBulkOpen(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove filtered items?</AlertDialogTitle>
            <AlertDialogDescription>{scopeSentence}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus className="rounded-full border-hairline bg-background font-display font-semibold px-6 h-11 hover:bg-surface-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFiltered}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display font-semibold px-6 h-11"
            >
              Remove {filteredAll.length} item{filteredAll.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set target price */}
      <Dialog open={!!targetItem} onOpenChange={(o) => { if (!o && !targetSaving) { setTargetItem(null); setTargetValue(""); setTargetError(null); } }}>
        <DialogContent className="max-w-sm bg-background">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Set target price</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            {targetItem ? `${targetItem.brand} — ${targetItem.model}` : ""}
          </p>
          <div>
            <MoneyInput
              value={targetValue}
              onChange={(e) => {
                const v = e.target.value;
                setTargetValue(v);
                // live-clear any prior error the moment the value becomes valid
                const { error } = validateTargetValue(v);
                setTargetError(error);
              }}

              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSaveTarget(); } }}
              placeholder="e.g. 12000"
              autoFocus
              aria-invalid={!!targetError}
            />
            {targetError ? (
              <p className="mt-1.5 text-xs text-destructive">{targetError}</p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Leave empty to clear the target.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" disabled={targetSaving} onClick={() => { setTargetItem(null); setTargetValue(""); setTargetError(null); }}>Cancel</Button>
            <Button onClick={handleSaveTarget} disabled={targetSaving || !!targetError} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {targetSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk select remove */}
      <AlertDialog open={bulkSelectRemoveOpen} onOpenChange={(o) => !o && !bulkSelectRemoving && setBulkSelectRemoveOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selected.size} {selected.size === 1 ? "item" : "items"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. Paused items will be promoted to fill any freed active slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSelectRemoving} className="rounded-full border-hairline bg-background font-display font-semibold px-6 h-11 hover:bg-surface-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleBulkSelectRemove(); }}
              disabled={bulkSelectRemoving}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display font-semibold px-6 h-11"
            >
              {bulkSelectRemoving ? "Removing…" : `Remove ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Free-limit upsell */}
      <Dialog open={upsellOpen} onOpenChange={setUpsellOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              You've reached the Free limit
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Free watchlists track up to {FREE_ACTIVE_CAP} items. Upgrade to Pro for:
          </p>
          <ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">
            <li>Unlimited watchlist tracking</li>
            <li>Unlimited portfolio pieces</li>
            <li>Priority price signals when live pricing launches</li>
          </ul>
          <p className="text-xs text-muted-foreground">Your existing items stay exactly where they are.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setUpsellOpen(false)} className="rounded-full font-display font-semibold px-6 h-11">
              Not now
            </Button>
            <Button
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11"
              onClick={() => {
                track("upgrade_click", { from: "watchlist_cap" });
                setUpsellOpen(false);
                window.location.assign("/app/settings");
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

function CategoryGroups({
  rows, tierFor: _tierFor, onRemove, onSetTarget, onViewSignals, isPaused = false,
  selectable = false, selectedIds, onToggleSelect,
}: {
  rows: WatchlistRow[];
  tierFor: (row: WatchlistRow) => Tier | null;
  onRemove: (id: string) => void;
  onSetTarget: (row: WatchlistRow) => void;
  onViewSignals: (row: WatchlistRow) => void;
  isPaused?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<Category, WatchlistRow[]> = { watches: [], jewelry: [], bags: [] };
    for (const r of rows) g[r.category].push(r);
    return g;
  }, [rows]);

  const renderCards = (list: WatchlistRow[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((row) => (
        <ItemCard key={row.id} row={row} isPaused={isPaused}
          onRemove={() => onRemove(row.id)}
          onSetTarget={() => onSetTarget(row)}
          onViewSignals={() => onViewSignals(row)}
          selectable={selectable}
          selected={selectedIds?.has(row.id) ?? false}
          onToggleSelect={() => onToggleSelect?.(row.id)} />
      ))}
    </div>
  );

  return (
    <>
      {CATEGORIES.map((c) => {
        const list = grouped[c];
        if (list.length === 0) return null;
        const Icon = CAT_ICONS[c];
        const brands = list.filter((r) => r.type === "brand");
        const pieces = list.filter((r) => r.type === "piece");
        const hasBoth = brands.length > 0 && pieces.length > 0;
        return (
          <div key={c} className={cn("mb-8", isPaused && "opacity-80")}>
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <h3 className="text-xs font-display font-semibold uppercase tracking-widest">
                {CATEGORY_LABELS[c]}
              </h3>
              {brands.length > 0 && pieces.length === 0 && (
                <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground/80">
                  Brands · {brands.length}
                </span>
              )}
            </div>
            {hasBoth ? (
              <>
                {brands.length > 0 ? (
                  <div className="mb-4">
                    <div className="mb-2 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground/80">
                      Brands · {brands.length}
                    </div>
                    {renderCards(brands)}
                  </div>
                ) : null}
                {pieces.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground/80">
                      Pieces · {pieces.length}
                    </div>
                    {renderCards(pieces)}
                  </div>
                ) : null}
              </>
            ) : (
              renderCards(list)
            )}
          </div>
        );
      })}
    </>
  );
}


function ItemCard({
  row, onRemove, onSetTarget, onViewSignals, isPaused = false,
  selectable = false, selected = false, onToggleSelect,
}: {
  row: WatchlistRow;
  onRemove: () => void;
  onSetTarget: () => void;
  onViewSignals: () => void;
  isPaused?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isPiece = row.type === "piece";
  // Brand-only cards: single-line dense row. Piece cards: richer, taller.
  const wrapClass = cn(
    "card-flat relative flex h-full transition-shadow",
    isPiece ? "flex-col px-4 py-3 min-h-[108px]" : "items-center px-4 py-2.5 min-h-[56px]",
    isPaused && "opacity-80",
    !isPiece && isPaused && "min-h-[52px]",
    selectable ? "cursor-pointer" : "",
    selected ? "ring-2 ring-primary shadow-md" : "",
  );
  const wrapProps = selectable
    ? { role: "button" as const, "aria-pressed": selected, onClick: (e: React.MouseEvent) => { e.stopPropagation(); onToggleSelect?.(); } }
    : {};
  const SelectDot = selectable ? (
    <div
      className={cn(
        "absolute z-10 h-6 w-6 rounded-full grid place-items-center border-2 transition-colors",
        isPiece ? "top-2 left-2" : "top-1/2 -translate-y-1/2 left-2",
        selected
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-background/85 border-hairline text-transparent",
      )}
      aria-hidden="true"
    >
      <Check className="h-3.5 w-3.5" />
    </div>
  ) : null;

  // Brand card: single-line dense row (used for both active and paused brand rows).
  if (!isPiece) {
    return (
      <article className={wrapClass} {...wrapProps}>
        {SelectDot}
        <div className={cn("flex-1 min-w-0 flex flex-col gap-0.5", selectable && "pl-7")}>
          <h4
            className="font-display font-semibold text-base leading-tight break-words line-clamp-2"
            title={row.brand}
          >
            {row.brand}
          </h4>
          {!isPaused ? (
            <TrendChip brand={row.brand} category={row.category} compact />
          ) : null}
        </div>
        {!selectable ? (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1 self-center">
            <ItemMenu type={row.type} onRemove={onRemove} onSetTarget={onSetTarget} onViewSignals={onViewSignals} paused={isPaused} />
          </div>
        ) : null}
      </article>
    );
  }


  // Paused piece card: header only, no target block.
  if (isPaused) {
    return (
      <article className={wrapClass} {...wrapProps}>
        {SelectDot}
        <header className={cn("flex items-start justify-between gap-2", selectable && "pl-7")}>
          <div className="min-w-0">
            <h4 className="font-display font-semibold text-lg leading-tight break-words line-clamp-2" title={`${row.brand} · ${row.model}`}>
              {row.brand} <span className="text-muted-foreground font-medium">· {row.model}</span>
            </h4>
          </div>
          {!selectable ? (
            <ItemMenu type={row.type} onRemove={onRemove} onSetTarget={onSetTarget} onViewSignals={onViewSignals} paused />
          ) : null}
        </header>
      </article>
    );
  }

  // Active piece card: title + target line.
  return (
    <article className={wrapClass} {...wrapProps}>
      {SelectDot}
      <header className={cn("flex items-start justify-between gap-2", selectable && "pl-7")}>
        <div className="min-w-0">
          <h4 className="font-display font-semibold text-lg leading-tight break-words line-clamp-2" title={`${row.brand} · ${row.model}`}>
            {row.brand} <span className="text-muted-foreground font-medium">· {row.model}</span>
          </h4>
        </div>
        {!selectable ? (
          <div onClick={(e) => e.stopPropagation()}>
            <ItemMenu type={row.type} onRemove={onRemove} onSetTarget={onSetTarget} onViewSignals={onViewSignals} />
          </div>
        ) : null}
      </header>

      <div className="mt-1.5">
        <TrendChip brand={row.brand} category={row.category} compact />
      </div>

      <div className="flex-1" />


      {isPiece ? (
        <footer className="mt-2">
          <p className="text-xs text-muted-foreground">
            {row.target_price != null ? (
              (() => {
                // DEMO ONLY — mock current price from shared demo module.
                const target = Number(row.target_price);
                const current = getMockMarketPrice(row.id, target).current;
                const gapPct = target > 0 ? ((current - target) / target) * 100 : 0;
                const above = current > target;
                const cls = above
                  ? "text-[color:var(--alert)]"
                  : "text-[color:var(--positive)]";
                const Arrow = above ? ArrowUpRight : ArrowDownRight;
                const sign = above ? "+" : "−";
                const label = `${sign}${Math.abs(gapPct).toFixed(1)}%`;
                return (
                  <>
                    <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Target</span>{" "}
                    ${target.toLocaleString()}{" "}
                    <span className={cn("inline-flex items-center gap-0.5 font-semibold", cls)}>
                      · <Arrow className="h-3 w-3" />{label}
                    </span>
                  </>
                );
              })()
            ) : (
              <>
                <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Target</span>{" "}
                <span className="text-muted-foreground/70">not set</span>
              </>
            )}
          </p>
        </footer>
      ) : null}
    </article>
  );
}

// DEMO ONLY — small brand price-index trend chip (YoY + QoQ).
function TrendChip({ brand, category, compact = false }: {
  brand: string;
  category: Category;
  compact?: boolean;
}) {
  const t = getMockBrandTrend(brand, category);
  const primary = t.yoy;
  const primaryUp = primary >= 0;
  const PrimaryArrow = primaryUp ? ArrowUpRight : ArrowDownRight;
  const primaryCls = primaryUp
    ? "text-[color:var(--positive)]"
    : "text-[color:var(--alert)]";
  const primarySign = primaryUp ? "+" : "−";
  const primaryLabel = `${primarySign}${Math.abs(primary).toFixed(1)}%`;

  const secondary = t.qoq;
  const secondaryUp = secondary >= 0;
  const secondarySign = secondaryUp ? "+" : "−";
  const secondaryLabel = `${secondarySign}${Math.abs(secondary).toFixed(1)}%`;
  const secondaryCls = secondaryUp
    ? "text-[color:var(--positive)]/85"
    : "text-[color:var(--alert)]/85";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums",
              compact ? "text-[11px]" : "text-xs",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-display font-semibold uppercase tracking-widest text-[9px] text-muted-foreground">1Y</span>
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", primaryCls)}>
              <PrimaryArrow className="h-3 w-3" />{primaryLabel}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-display font-semibold uppercase tracking-widest text-[9px] text-muted-foreground">Q</span>
            <span className={cn("font-semibold", secondaryCls)}>{secondaryLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5 tabular-nums">
            <div>Avg secondary-market price · {brand}</div>
            <div className="text-muted-foreground">
              1Y {primarySign}{Math.abs(t.yoy).toFixed(1)}% · Q {secondarySign}{Math.abs(t.qoq).toFixed(1)}% · 30d {t.d30 >= 0 ? "+" : "−"}{Math.abs(t.d30).toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground/70 pt-1">Demo data — indicative only</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



function ItemMenu({
  type, onRemove, onSetTarget, onViewSignals, paused = false,
}: {
  type: "brand" | "piece";
  onRemove: () => void;
  onSetTarget: () => void;
  onViewSignals: () => void;
  paused?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Item actions"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-full hover:bg-surface-2 text-muted-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!paused ? (
          <DropdownMenuItem onSelect={onViewSignals}>View signals</DropdownMenuItem>
        ) : null}
        {type === "piece" && !paused ? (
          <DropdownMenuItem onSelect={onSetTarget}>Set target price</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onRemove} className="text-destructive focus:text-destructive">
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function AddMenu({ onAddBrand, onAddPiece }: { onAddBrand: () => void; onAddPiece: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onAddBrand}>Add a brand</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddPiece}>Add a piece</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    if (selected.size === 0 || selected.size === options.length) return "All";
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
      <PopoverContent align="start" className="w-52 p-1.5">
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-surface-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => { if (!allSelected) onAll(); }}
          />
          <span className="font-medium">All</span>
        </label>
        <div className="my-1 h-px bg-hairline" />
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

