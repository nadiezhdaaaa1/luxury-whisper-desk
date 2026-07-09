import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  computeTotals,
  deletePortfolioItem,
  fetchPortfolio,
  insertPortfolioItem,
  portfolioCapFor,
  updatePortfolioItem,
  type PortfolioInput,
  type PortfolioRow,
} from "@/lib/portfolio";
import { TotalValueHeader } from "@/components/portfolio/TotalValueHeader";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { AddEditPortfolioModal } from "@/components/portfolio/AddEditPortfolioModal";
import { useBrandsCatalog } from "@/lib/catalog";
import { pickLastSignal, resolveBrandSlug, useSignalsForSlugs } from "@/lib/signals";

type Filter = "all" | Category;

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
  const pfQ = useQuery({ queryKey: ["portfolio"], queryFn: fetchPortfolio });

  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<PortfolioRow | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rows = pfQ.data ?? [];
  const cap = portfolioCapFor(profileQ.data?.plan);
  const totals = useMemo(() => computeTotals(rows), [rows]);

  const catalogQ = useBrandsCatalog();
  const slugs = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category === "bags") continue;
      const s = resolveBrandSlug(catalogQ.data, r.brand, r.category);
      if (s) set.add(s);
    }
    return [...set];
  }, [rows, catalogQ.data]);
  const signalsQ = useSignalsForSlugs(slugs);

  useEffect(() => {
    if (pfQ.data) track("portfolio_viewed", { count: pfQ.data.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfQ.data?.length]);

  const filtered = rows.filter((r) => filter === "all" || r.category === filter);
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

  const loading = pfQ.isLoading || profileQ.isLoading;
  const errored = pfQ.isError;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <PageHeader
          title="Your portfolio"
          subtitle="Everything you own — track purchase value now, market value coming soon."
        />
        <div className="mt-1">
          <Button
            onClick={openAdd}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add to my portfolio
          </Button>
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton className="h-40 w-full rounded-3xl mb-8" />
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
      ) : (
        <>
          <TotalValueHeader
            total={totals.total}
            pricedCount={totals.pricedCount}
            totalCount={totals.totalCount}
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
                {CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Your portfolio is empty"
              description="Add your first piece to see it here."
              action={
                <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add to my portfolio
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={`No ${filter === "all" ? "items" : CATEGORY_LABELS[filter as Category].toLowerCase()} yet`}
              description="Switch categories or add a piece."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((row) => {
                const slug = resolveBrandSlug(catalogQ.data, row.brand, row.category);
                const lastSignal = row.category === "bags"
                  ? null
                  : pickLastSignal(signalsQ.data, { brand_slug: slug, model: row.model });
                return (
                  <PortfolioCard
                    key={row.id}
                    row={row}
                    lastSignal={lastSignal}
                    onEdit={() => { setEditRow(row); setAddOpen(true); }}
                    onRemove={() => setConfirmRemoveId(row.id)}
                  />
                );
              })}
            </div>
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
            <Button variant="ghost" onClick={() => setUpsellOpen(false)}>Not now</Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { track("upgrade_click", { from: "portfolio_cap" }); setUpsellOpen(false); }}
            >
              Upgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-1.5 text-sm font-display font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
