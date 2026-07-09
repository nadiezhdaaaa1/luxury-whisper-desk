import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, MoreVertical, Plus, RotateCcw, Trash2,
  Watch, Gem, ShoppingBag, Sparkles, DollarSign, Users2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { EmptyState } from "@/components/app/EmptyState";
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
import { pickLastSignal, relativeTime, resolveBrandSlug, useSignalsForSlugs, type SignalRow } from "@/lib/signals";
import { AddBrandModal } from "@/components/watchlist/AddBrandModal";
import { AddPieceModal } from "@/components/watchlist/AddPieceModal";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  component: WatchlistPage,
});

type CatFilter = "all" | Category;
type TierFilter = "all" | Tier;

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
const TIER_ICONS: Record<Tier, typeof Sparkles> = {
  luxury_invest: Sparkles,
  mid_market: DollarSign,
  mass_market: Users2,
};

function WatchlistPage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const activeCap = activeCapFor(profileQ.data?.plan);
  const isFree = profileQ.data?.plan !== "pro";
  const [seededOnce, setSeededOnce] = useState(false);
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<WatchlistRow | null>(null);
  const [targetValue, setTargetValue] = useState("");

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

  const rows = wlQ.data ?? [];

  const tierFor = (row: WatchlistRow): Tier | null => {
    const hit = catalogQ.data?.find((b) => b.name === row.brand && b.category === row.category);
    return hit?.tier ?? null;
  };

  const slugs = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = resolveBrandSlug(catalogQ.data, r.brand, r.category);
      if (s) set.add(s);
    }
    return [...set];
  }, [rows, catalogQ.data]);
  const signalsQ = useSignalsForSlugs(slugs);
  const lastSignalFor = (row: WatchlistRow): SignalRow | null => {
    const slug = resolveBrandSlug(catalogQ.data, row.brand, row.category);
    return pickLastSignal(signalsQ.data, {
      brand_slug: slug,
      model: row.type === "piece" ? row.model : null,
    });
  };

  const inFilter = (r: WatchlistRow) => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (tierFilter !== "all") {
      const t = tierFor(r);
      if (t !== tierFilter) return false;
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
    if (catFilter === "all" && tierFilter === "all") return "";
    const parts: string[] = [];
    if (tierFilter !== "all") parts.push(TIER_SHORT[tierFilter]);
    if (catFilter !== "all") parts.push(CATEGORY_LABELS[catFilter]);
    return parts.join(" ");
  }, [catFilter, tierFilter]);

  function updateCatFilter(next: CatFilter) {
    setCatFilter(next);
    track("watchlist_filter_changed", { category: next, tier: tierFilter });
  }
  function updateTierFilter(next: TierFilter) {
    setTierFilter(next);
    track("watchlist_filter_changed", { category: catFilter, tier: next });
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
      category: catFilter, tier: tierFilter, count: ids.length,
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

  async function handleAddBrands(picks: Array<{ category: Category; brand: string }>) {
    if (picks.length === 0) return;
    const activeCount = activeRows.length;
    const rowsToInsert = picks.map((p, i) => ({
      type: "brand" as const,
      category: p.category,
      brand: p.brand,
      is_active: activeCount + i < activeCap,
    }));
    await insertItems(rowsToInsert);
    picks.forEach((p) => track("watchlist_brand_added", { category: p.category, brand: p.brand }));
    if (rowsToInsert.some((r) => !r.is_active)) {
      track("watchlist_free_limit_reached", { attempted: rowsToInsert.length });
    }
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  async function handleAddPiece(pick: { category: Category; brand: string; model: string; target_price: number | null }) {
    const willBeActive = activeRows.length < activeCap;
    await insertItems([{
      type: "piece",
      category: pick.category,
      brand: pick.brand,
      model: pick.model,
      target_price: pick.target_price,
      is_active: willBeActive,
    }]);
    track("watchlist_piece_added", { category: pick.category, brand: pick.brand, model: pick.model });
    if (pick.target_price != null) {
      track("watchlist_target_set", { brand: pick.brand, model: pick.model, target: pick.target_price });
    }
    if (!willBeActive) track("watchlist_free_limit_reached", { attempted: 1 });
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  async function handleSaveTarget() {
    if (!targetItem) return;
    const parsed = targetValue.trim() === "" ? null : Number(targetValue);
    const value = parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    await updateItem(targetItem.id, { target_price: value });
    if (value != null) {
      track("watchlist_target_set", { brand: targetItem.brand, model: targetItem.model, target: value });
    }
    setTargetItem(null);
    setTargetValue("");
    await qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  const followedByCategory: Record<Category, Set<string>> = useMemo(() => {
    const out = { watches: new Set<string>(), jewelry: new Set<string>(), bags: new Set<string>() };
    for (const r of rows) if (r.type === "brand") out[r.category].add(r.brand);
    return out;
  }, [rows]);

  const loading = wlQ.isLoading || profileQ.isLoading;
  const errored = wlQ.isError;

  const scopeSentence = filterScopeLabel
    ? `This will remove all ${filteredAll.length} ${filterScopeLabel} items (Active and Paused). This can't be undone.`
    : `This will remove all ${filteredAll.length} items from your watchlist (Active and Paused). This can't be undone.`;

  return (
    <div>
      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Category group */}
        <FilterPill
          active={catFilter === "all" && tierFilter === "all"}
          onClick={() => {
            updateCatFilter("all");
            setTierFilter("all");
          }}
        >
          All
        </FilterPill>
        {CATEGORIES.map((c) => {
          const Icon = CAT_ICONS[c];
          return (
            <FilterPill
              key={c}
              active={catFilter === c}
              onClick={() => updateCatFilter(catFilter === c ? "all" : c)}
              icon={<Icon className="h-3.5 w-3.5" />}
            >
              {CATEGORY_LABELS[c]}
            </FilterPill>
          );
        })}

        {/* Visual gap between category and tier groups */}
        <div className="w-6" aria-hidden="true" />

        {/* Tier group */}
        {(Object.keys(TIER_SHORT) as Tier[]).map((t) => {
          const Icon = TIER_ICONS[t];
          return (
            <FilterPill
              key={t}
              active={tierFilter === t}
              onClick={() => updateTierFilter(tierFilter === t ? "all" : t)}
              icon={<Icon className="h-3.5 w-3.5" />}
            >
              {TIER_SHORT[t]}
            </FilterPill>
          );
        })}

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />

        {/* Icon actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Clear filters"
              onClick={() => {
                setCatFilter("all");
                setTierFilter("all");
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
                  category: catFilter,
                  tier: tierFilter,
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

        <div className="ml-auto">
          <AddMenu onAddBrand={() => setAddBrandOpen(true)} onAddPiece={() => setAddPieceOpen(true)} />
        </div>
      </div>


      {/* Free-limit banner */}
      {overCap ? (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "#5a1a2b", color: "#fdf3ef" }}>
          <span>Free accounts have a {FREE_ACTIVE_CAP} watchlist-item limit.</span>{" "}
          <span className="opacity-80">Upgrade to keep tracking all of them.</span>{" "}
          <a
            href="/app/upgrade"
            className="underline underline-offset-2 font-semibold"
            onClick={() => track("upgrade_click", { from: "watchlist_cap" })}
          >
            Upgrade
          </a>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : errored ? (
        <EmptyState
          title="Couldn't load your watchlist"
          description="Please try again."
          action={<Button onClick={() => qc.invalidateQueries({ queryKey: ["watchlist"] })}>Retry</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Add brands you follow or specific pieces you're tracking."
          action={
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setAddBrandOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Add a brand
              </Button>
              <Button variant="ghost" onClick={() => setAddPieceOpen(true)}>Add a piece</Button>
            </div>
          }
        />
      ) : (
        <>
          <CategoryGroups rows={activeFiltered} lastSignalFor={lastSignalFor} tierFor={tierFor}
            onRemove={(id) => setConfirmRemoveId(id)}
            onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); }} />

          {pausedFiltered.length > 0 ? (
            <>
              <div className="mt-8 mb-4 flex items-center gap-3">
                <h2 className="font-display text-xl font-semibold tracking-tight">Paused</h2>
                <span className="text-sm text-muted-foreground">{pausedFiltered.length}</span>
              </div>
              <CategoryGroups rows={pausedFiltered} lastSignalFor={lastSignalFor} tierFor={tierFor}
                onRemove={(id) => setConfirmRemoveId(id)}
                onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); }} />
            </>
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

      {/* Bulk remove */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={(o) => {
        if (!o) {
          if (confirmBulkOpen) track("watchlist_remove_filtered_canceled", { category: catFilter, tier: tierFilter });
          setConfirmBulkOpen(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove filtered items?</AlertDialogTitle>
            <AlertDialogDescription>{scopeSentence}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFiltered}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove {filteredAll.length} item{filteredAll.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set target price */}
      <Dialog open={!!targetItem} onOpenChange={(o) => { if (!o) { setTargetItem(null); setTargetValue(""); } }}>
        <DialogContent className="max-w-sm bg-background">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Set target price</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            {targetItem ? `${targetItem.brand} — ${targetItem.model}` : ""}
          </p>
          <MoneyInput
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 12000"
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => { setTargetItem(null); setTargetValue(""); }}>Cancel</Button>
            <Button onClick={handleSaveTarget} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryGroups({
  rows, lastSignalFor, tierFor, onRemove, onSetTarget,
}: {
  rows: WatchlistRow[];
  lastSignalFor: (row: WatchlistRow) => SignalRow | null;
  tierFor: (row: WatchlistRow) => Tier | null;
  onRemove: (id: string) => void;
  onSetTarget: (row: WatchlistRow) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<Category, WatchlistRow[]> = { watches: [], jewelry: [], bags: [] };
    for (const r of rows) g[r.category].push(r);
    return g;
  }, [rows]);

  return (
    <>
      {CATEGORIES.map((c) => {
        const list = grouped[c];
        if (list.length === 0) return null;
        const Icon = CAT_ICONS[c];
        return (
          <div key={c} className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <h3 className="text-xs font-display font-semibold uppercase tracking-widest">
                {CATEGORY_LABELS[c]}
              </h3>
              <span className="text-xs">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((row) => (
                <ItemCard key={row.id} row={row} tier={tierFor(row)}
                  lastSignal={lastSignalFor(row)}
                  onRemove={() => onRemove(row.id)}
                  onSetTarget={() => onSetTarget(row)} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function ItemCard({
  row, tier, lastSignal, onRemove, onSetTarget,
}: {
  row: WatchlistRow;
  tier: Tier | null;
  lastSignal: SignalRow | null;
  onRemove: () => void;
  onSetTarget: () => void;
}) {
  const isPiece = row.type === "piece";
  return (
    <article className="relative h-full rounded-2xl border border-hairline bg-card p-5 shadow-soft flex flex-col min-h-[180px]">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <TypeBadge piece={isPiece} />
          {tier ? <TierBadge tier={tier} /> : null}
        </div>
        <ItemMenu type={row.type} onRemove={onRemove} onSetTarget={onSetTarget} />
      </header>

      <div className="mt-3">
        <h4 className="font-display font-semibold text-lg leading-tight truncate">
          {isPiece ? (
            <>
              {row.brand} <span className="text-muted-foreground font-medium">· {row.model}</span>
            </>
          ) : row.brand}
        </h4>
      </div>

      <div className="flex-1" />

      <footer className="mt-4 space-y-1">
        {isPiece ? (
          <p className="text-xs text-muted-foreground">
            {row.target_price != null ? (
              <>
                <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Target</span>{" "}
                ${Number(row.target_price).toLocaleString()} <span className="text-muted-foreground/70">· gap coming soon</span>
              </>
            ) : (
              <>
                <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Target</span>{" "}
                <span className="text-muted-foreground/70">not set</span>
              </>
            )}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Last signal</span>
          {lastSignal ? ` · ${relativeTime(lastSignal.signal_date)}` : " · no signals yet"}
        </p>
      </footer>
    </article>
  );
}

function TypeBadge({ piece }: { piece: boolean }) {
  if (piece) {
    return (
      <span className="text-[10px] font-display font-semibold uppercase tracking-widest rounded-md bg-primary text-primary-foreground px-2 py-0.5">
        Piece
      </span>
    );
  }
  return (
    <span className="text-[10px] font-display font-semibold uppercase tracking-widest rounded-md bg-surface-2 text-foreground/70 px-2 py-0.5">
      Brand
    </span>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="text-[10px] font-display font-semibold uppercase tracking-widest rounded-md bg-champagne-soft text-foreground/70 px-2 py-0.5">
      {TIER_BADGE[tier]}
    </span>
  );
}

function ItemMenu({
  type, onRemove, onSetTarget,
}: {
  type: "brand" | "piece";
  onRemove: () => void;
  onSetTarget: () => void;
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
        {type === "piece" ? (
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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-display group">
          <Plus className="h-4 w-4 mr-1" />
          Add to watchlist
          <ChevronDown className="h-4 w-4 ml-1 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onAddBrand}>Add a brand</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddPiece}>Add a piece</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterPill({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-display font-semibold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-hairline hover:bg-surface-2",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
