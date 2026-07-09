import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import { TIER_LABELS } from "@/lib/watchlist";
import { TIERS, useBrandsCatalog, type Tier } from "@/lib/catalog";
import watchImg from "@/assets/tag-heuer-carrera.png.asset.json";
import ringImg from "@/assets/jewelry.png.asset.json";
import bagImg from "@/assets/bags.png.asset.json";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  followedByCategory: Record<Category, Set<string>>;
  onConfirm: (picks: Array<{ category: Category; brand: string }>) => void;
};

const CAT_IMG: Record<Category, string> = {
  watches: watchImg.url,
  jewelry: ringImg.url,
  bags: bagImg.url,
};

export function AddBrandModal({ open, onOpenChange, followedByCategory, onConfirm }: Props) {
  const [activeCat, setActiveCat] = useState<Category>("watches");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [q, setQ] = useState("");
  // key: `${cat}::${brand}` — persists across category/tier tab switches
  const [picks, setPicks] = useState<Record<string, { category: Category; brand: string }>>({});
  const catalog = useBrandsCatalog();

  const brands = useMemo(() => {
    const rows = (catalog.data ?? []).filter((b) => b.category === activeCat);
    return rows.filter((b) => {
      if (tier !== "all" && b.tier !== tier) return false;
      if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [catalog.data, activeCat, tier, q]);

  const totalPicked = Object.keys(picks).length;

  function toggle(cat: Category, brand: string) {
    const key = `${cat}::${brand}`;
    setPicks((p) => {
      const next = { ...p };
      if (next[key]) delete next[key];
      else next[key] = { category: cat, brand };
      return next;
    });
  }

  function reset() { setPicks({}); setQ(""); setTier("all"); setActiveCat("watches"); }
  function handleConfirm() { onConfirm(Object.values(picks)); reset(); onOpenChange(false); }
  function handleCancel() { reset(); onOpenChange(false); }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleCancel())}>
      <DialogContent className="max-w-2xl bg-champagne-soft border-0 p-6 gap-4 [&>button]:hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Add a brand</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const active = c === activeCat;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c)}
                className={[
                  "relative flex items-center justify-between rounded-full pl-5 pr-2 py-3 text-left transition-all font-display font-semibold overflow-hidden",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-surface-2 border border-hairline",
                ].join(" ")}
              >
                <span className="text-base">{CATEGORY_LABELS[c]}</span>
                <img src={CAT_IMG[c]} alt="" className="h-10 w-14 object-contain object-right" />
              </button>
            );
          })}
        </div>

        {/* Tier filter pills */}
        <div className="flex flex-wrap gap-2">
          <FilterChip active={tier === "all"} onClick={() => setTier("all")}>All</FilterChip>
          {TIERS.map((t) => (
            <FilterChip key={t} active={tier === t} onClick={() => setTier(t)}>
              {TIER_LABELS[t]}
            </FilterChip>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brands"
            className="pl-10 h-12 bg-background rounded-full border-hairline"
          />
        </div>

        {/* Brand list */}
        <div className="max-h-80 overflow-y-auto rounded-2xl border border-hairline bg-background/40 p-2">
          {catalog.isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading brands…</p>
          ) : brands.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No brands match.</p>
          ) : (
            <ul className="space-y-1">
              {brands.map((b) => {
                const followed = followedByCategory[activeCat]?.has(b.name);
                const key = `${activeCat}::${b.name}`;
                const picked = !!picks[key];
                return (
                  <li key={b.slug}>
                    <button
                      type="button"
                      disabled={followed}
                      onClick={() => toggle(activeCat, b.name)}
                      className={[
                        "w-full flex items-center justify-between gap-3 rounded-full px-5 py-3 text-left transition-colors",
                        followed
                          ? "bg-champagne-soft/70 text-muted-foreground cursor-not-allowed"
                          : picked
                            ? "bg-primary text-primary-foreground"
                            : "bg-transparent hover:bg-surface-2",
                      ].join(" ")}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-display font-semibold text-base">{b.name}</span>
                        <span className={[
                          "text-[10px] uppercase tracking-widest font-semibold",
                          picked ? "text-primary-foreground/60" : "text-muted-foreground",
                        ].join(" ")}>
                          {TIER_LABELS[b.tier].toUpperCase()}
                        </span>
                      </span>
                      {followed ? (
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Followed</span>
                      ) : picked ? (
                        <Check className="h-5 w-5" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="font-display font-semibold text-sm px-3 py-2 hover:opacity-70"
          >
            Cancel
          </button>
          <Button
            disabled={totalPicked === 0}
            onClick={handleConfirm}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11 disabled:bg-muted-foreground/50 disabled:text-white disabled:opacity-100"
          >
            Add {totalPicked} to watchlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-5 py-2 text-sm font-display font-semibold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-hairline hover:bg-surface-2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
