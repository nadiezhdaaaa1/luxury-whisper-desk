import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import { allBrandsForCategory, modelsForBrand } from "@/lib/watchlist";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (pick: { category: Category; brand: string; model: string; target_price: number | null }) => void;
};

export function AddPieceModal({ open, onOpenChange, onConfirm }: Props) {
  const [activeCat, setActiveCat] = useState<Category>("watches");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [brandQ, setBrandQ] = useState("");
  const [modelQ, setModelQ] = useState("");
  const [target, setTarget] = useState("");

  const brands = useMemo(() => {
    const list = allBrandsForCategory(activeCat).map((b) => b.name);
    const q = brandQ.toLowerCase();
    return q ? list.filter((n) => n.toLowerCase().includes(q)) : list;
  }, [activeCat, brandQ]);

  const models = useMemo(() => {
    if (!brand) return [];
    const q = modelQ.toLowerCase();
    const list = modelsForBrand(brand);
    return q ? list.filter((n) => n.toLowerCase().includes(q)) : list;
  }, [brand, modelQ]);

  function reset() {
    setBrand(""); setModel(""); setBrandQ(""); setModelQ(""); setTarget("");
  }

  function handleConfirm() {
    if (!brand || !model) return;
    const parsed = target.trim() === "" ? null : Number(target);
    onConfirm({
      category: activeCat,
      brand,
      model,
      target_price: parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add a piece</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const active = c === activeCat;
            const coming = c === "bags";
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setActiveCat(c); setBrand(""); setModel(""); }}
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

        {/* Brand typeahead */}
        <Field label="Brand">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={brand || brandQ}
              onChange={(e) => { setBrand(""); setBrandQ(e.target.value); setModel(""); }}
              placeholder="Search brand"
              className="pl-9 bg-white"
            />
          </div>
          {!brand ? (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-hairline bg-surface/60 p-1">
              {brands.length === 0 ? (
                <li className="text-xs text-muted-foreground py-2 px-2">No brands</li>
              ) : brands.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => { setBrand(n); setBrandQ(n); }}
                    className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    {n}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>

        {/* Model typeahead (disabled until brand) */}
        <Field label="Piece / Model">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              disabled={!brand}
              value={model || modelQ}
              onChange={(e) => { setModel(""); setModelQ(e.target.value); }}
              placeholder={brand ? "Search model" : "Choose a brand first"}
              className="pl-9 bg-white disabled:bg-surface-2"
            />
          </div>
          {brand && !model ? (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-hairline bg-surface/60 p-1">
              {models.length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  No suggestions — type your own and press add.
                </li>
              ) : models.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => { setModel(n); setModelQ(n); }}
                    className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    {n}
                  </button>
                </li>
              ))}
              {modelQ && !models.includes(modelQ) ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setModel(modelQ)}
                    className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-surface-2 text-primary"
                  >
                    Use "{modelQ}"
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </Field>

        <Field label="Target price (optional)">
          <MoneyInput
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 12000"
          />
        </Field>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            disabled={!brand || !model}
            onClick={handleConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add to watchlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
