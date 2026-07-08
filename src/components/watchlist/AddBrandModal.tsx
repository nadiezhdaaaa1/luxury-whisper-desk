import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, SEGMENTS, type Category, type Segment } from "@/lib/quiz";
import { allBrandsForCategory, TIER_LABELS } from "@/lib/watchlist";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  followedByCategory: Record<Category, Set<string>>; // brand names already followed per category
  onConfirm: (picks: Array<{ category: Category; brand: string }>) => void;
};

export function AddBrandModal({ open, onOpenChange, followedByCategory, onConfirm }: Props) {
  const [activeCat, setActiveCat] = useState<Category>("watches");
  const [tier, setTier] = useState<Segment | "all">("all");
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<Record<string, { category: Category; brand: string }>>({});

  const brands = useMemo(() => {
    const all = allBrandsForCategory(activeCat);
    return all.filter((b) => {
      if (tier !== "all" && !b.segments.includes(tier)) return false;
      if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [activeCat, tier, q]);

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

  function handleConfirm() {
    onConfirm(Object.values(picks));
    setPicks({});
    setQ("");
    onOpenChange(false);
  }

  function handleCancel() {
    setPicks({});
    setQ("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleCancel())}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add a brand</DialogTitle>
        </DialogHeader>

        {/* Category tabs — landing "Categories" card style */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const active = c === activeCat;
            const coming = c === "bags";
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c)}
                className={[
                  "relative rounded-2xl border p-4 text-left transition-all font-display font-semibold",
                  active
                    ? "bg-card border-white shadow-soft text-foreground"
                    : "bg-champagne-soft border-transparent text-primary hover:opacity-85",
                ].join(" ")}
              >
                <span>{CATEGORY_LABELS[c]}</span>
                {coming ? (
                  <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest rounded-full bg-background/70 px-1.5 py-0.5 text-muted-foreground">
                    Coming soon
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tier filter chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip active={tier === "all"} onClick={() => setTier("all")}>All</FilterChip>
          {SEGMENTS.map((s) => (
            <FilterChip key={s} active={tier === s} onClick={() => setTier(s)}>
              {TIER_LABELS[s]}
            </FilterChip>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brands"
            className="pl-9 bg-white"
          />
        </div>

        {/* Brand list */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-hairline bg-surface/60 p-2">
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No brands match.</p>
          ) : (
            <ul className="space-y-1">
              {brands.map((b) => {
                const followed = followedByCategory[activeCat]?.has(b.name);
                const key = `${activeCat}::${b.name}`;
                const picked = !!picks[key];
                return (
                  <li key={b.name}>
                    <button
                      type="button"
                      disabled={followed}
                      onClick={() => toggle(activeCat, b.name)}
                      className={[
                        "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-display transition-colors",
                        followed
                          ? "bg-surface-2/60 text-muted-foreground cursor-not-allowed"
                          : picked
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-surface-2",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{b.name}</span>
                        <span className={picked ? "text-primary-foreground/60 text-[10px] uppercase tracking-widest" : "text-muted-foreground text-[10px] uppercase tracking-widest"}>
                          {b.segments.map((s) => TIER_LABELS[s]).join(" · ")}
                        </span>
                      </span>
                      {followed ? (
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Followed</span>
                      ) : picked ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button
            disabled={totalPicked === 0}
            onClick={handleConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add {totalPicked || 0} to watchlist
          </Button>
        </DialogFooter>
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
