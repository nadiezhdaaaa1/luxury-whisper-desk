import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MoreVertical, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { useBrandsCatalog } from "@/lib/catalog";
import { pickLastSignal, relativeTime, resolveBrandSlug, useSignalsForSlugs, type SignalRow } from "@/lib/signals";
import { AddBrandModal } from "@/components/watchlist/AddBrandModal";
import { AddPieceModal } from "@/components/watchlist/AddPieceModal";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  component: WatchlistPage,
});

type Filter = "all" | Category;

function WatchlistPage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const wlQ = useQuery({ queryKey: ["watchlist"], queryFn: fetchWatchlist });
  const catalogQ = useBrandsCatalog();

  const activeCap = activeCapFor(profileQ.data?.plan);
  const [seededOnce, setSeededOnce] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addPieceOpen, setAddPieceOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
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
  const activeRows = rows.filter((r) => r.is_active);
  const pausedRows = rows.filter((r) => !r.is_active);
  const overCap = activeRows.length + pausedRows.length > activeCap && pausedRows.length > 0;

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

  function inFilter(r: WatchlistRow) { return filter === "all" || r.category === filter; }
  const activeFiltered = activeRows.filter(inFilter);
  const pausedFiltered = pausedRows.filter(inFilter);

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
        if (promote) {
          await updateItem(promote.id, { is_active: true });
        }
      }
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setConfirmRemoveId(null);
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

  // followed map for AddBrandModal
  const followedByCategory: Record<Category, Set<string>> = useMemo(() => {
    const out = { watches: new Set<string>(), jewelry: new Set<string>(), bags: new Set<string>() };
    for (const r of rows) {
      if (r.type === "brand") out[r.category].add(r.brand);
    }
    return out;
  }, [rows]);

  const loading = wlQ.isLoading || profileQ.isLoading;
  const errored = wlQ.isError;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Items you're eyeing"
          subtitle="Track targets and get pinged when items move"
        />
        <div className="mt-1">
          <AddMenu onAddBrand={() => setAddBrandOpen(true)} onAddPiece={() => setAddPieceOpen(true)} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

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
          <Section
            title="Active"
            rows={activeFiltered}
            lastSignalFor={lastSignalFor}
            onRemove={(id) => setConfirmRemoveId(id)}
            onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); }}
          />

          {pausedRows.length > 0 ? (
            <>
              {overCap ? (
                <div className="mt-10 mb-4 rounded-xl border border-hairline bg-champagne-soft/50 px-4 py-3 text-sm">
                  <span className="font-display font-semibold text-foreground">
                    Free accounts have a {FREE_ACTIVE_CAP} watchlist-item limit.
                  </span>{" "}
                  <span className="text-muted-foreground">
                    Upgrade to keep tracking all of them.
                  </span>{" "}
                  <a
                    href="/app/upgrade"
                    className="text-primary font-display font-semibold underline underline-offset-2 ml-1"
                    onClick={() => track("upgrade_click", { from: "watchlist_cap" })}
                  >
                    Upgrade
                  </a>
                </div>
              ) : null}
              <Section
                title="Paused"
                rows={pausedFiltered}
                muted
                lastSignalFor={lastSignalFor}
                onRemove={(id) => setConfirmRemoveId(id)}
                onSetTarget={(row) => { setTargetItem(row); setTargetValue(row.target_price ? String(row.target_price) : ""); }}
              />
            </>
          ) : null}
        </>
      )}

      <AddBrandModal
        open={addBrandOpen}
        onOpenChange={setAddBrandOpen}
        followedByCategory={followedByCategory}
        onConfirm={handleAddBrands}
      />
      <AddPieceModal
        open={addPieceOpen}
        onOpenChange={setAddPieceOpen}
        onConfirm={handleAddPiece}
      />

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

function Section({
  title, rows, muted, lastSignalFor, onRemove, onSetTarget,
}: {
  title: string;
  rows: WatchlistRow[];
  muted?: boolean;
  lastSignalFor: (row: WatchlistRow) => SignalRow | null;
  onRemove: (id: string) => void;
  onSetTarget: (row: WatchlistRow) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<Category, WatchlistRow[]> = { watches: [], jewelry: [], bags: [] };
    for (const r of rows) g[r.category].push(r);
    return g;
  }, [rows]);

  const hasAny = rows.length > 0;

  return (
    <section className={muted ? "mt-4 opacity-95" : "mt-6"}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground italic mb-4">Nothing here matches this filter.</p>
      ) : null}

      {CATEGORIES.map((c) => {
        const list = grouped[c];
        if (list.length === 0) return null;
        return (
          <div key={c} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABELS[c]}
              </h3>
              <span className="text-[10px] text-muted-foreground/70">{list.length}</span>
            </div>




            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((row) => (
                <ItemCard
                  key={row.id}
                  row={row}
                  lastSignal={lastSignalFor(row)}
                  onRemove={() => onRemove(row.id)}
                  onSetTarget={() => onSetTarget(row)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ItemCard({
  row, lastSignal, onRemove, onSetTarget,
}: {
  row: WatchlistRow;
  lastSignal: SignalRow | null;
  onRemove: () => void;
  onSetTarget: () => void;
}) {
  const isBags = row.category === "bags";
  return (
    <article className="relative h-full rounded-2xl border border-hairline bg-card p-5 shadow-soft flex flex-col min-h-[210px]">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {row.type === "piece" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display font-semibold uppercase tracking-widest rounded-full bg-champagne-soft text-primary px-2 py-0.5">
                  Piece
                </span>
              </div>
              <h4 className="mt-2 font-display font-semibold text-base leading-tight truncate">
                {row.brand} — <span className="text-muted-foreground font-medium">{row.model}</span>
              </h4>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-display font-semibold uppercase tracking-widest rounded-full bg-surface-2 text-muted-foreground px-2 py-0.5">
                  Brand
                </span>
              </div>
              <h4 className="mt-2 font-display font-semibold text-lg leading-tight truncate">{row.brand}</h4>
            </>
          )}
        </div>
        <ItemMenu type={row.type} onRemove={onRemove} onSetTarget={onSetTarget} />
      </header>

      <div className="flex-1" />

      <footer className="mt-4 space-y-1.5">
        {isBags ? (
          <span className="inline-flex items-center rounded-full bg-champagne-soft text-primary text-[10px] font-display font-semibold uppercase tracking-widest px-2 py-0.5">
            Coming soon
          </span>
        ) : (
          <p className="text-xs text-muted-foreground">
            <span className="font-display font-semibold uppercase tracking-widest text-[10px] text-foreground/70">Last signal</span>
            {lastSignal ? ` · ${relativeTime(lastSignal.signal_date)}` : " — no signals yet"}
          </p>
        )}
        {row.type === "piece" ? (
          <p className="text-xs text-muted-foreground/80">
            {row.target_price != null ? (
              <>Target ${Number(row.target_price).toLocaleString()} — gap coming soon</>
            ) : (
              <>Price &amp; gap to target coming soon</>
            )}
          </p>
        ) : null}
      </footer>
    </article>
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-display font-semibold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-hairline hover:bg-surface-2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

