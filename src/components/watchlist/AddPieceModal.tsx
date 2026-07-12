import { useMemo, useState } from "react";
import { Info, X } from "lucide-react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoneyInput } from "@/components/ui/money-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import { useBrandsCatalog, useModelsForBrand, findBrand } from "@/lib/catalog";
import watchImg from "@/assets/tabs-watches.png.asset.json";
import ringImg from "@/assets/tabs-jewelry.png.asset.json";
import bagImg from "@/assets/tabs-bags.png.asset.json";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (pick: { category: Category; brand: string; model: string; target_price: number | null }) => void;
};

const CAT_IMG: Record<Category, string> = {
  watches: watchImg.url,
  jewelry: ringImg.url,
  bags: bagImg.url,
};

export function AddPieceModal({ open, onOpenChange, onConfirm }: Props) {
  const [activeCat, setActiveCat] = useState<Category>("watches");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [target, setTarget] = useState("");

  const catalog = useBrandsCatalog();

  const brandOptions = useMemo(
    () => (catalog.data ?? []).filter((b) => b.category === activeCat).map((r) => r.name),
    [catalog.data, activeCat],
  );

  const brandSlug = useMemo(() => {
    if (!brand) return null;
    return findBrand(catalog.data ?? [], brand, activeCat)?.slug ?? null;
  }, [brand, activeCat, catalog.data]);

  const modelsQuery = useModelsForBrand(brandSlug);
  const modelOptions = useMemo(() => (modelsQuery.data ?? []).map((m) => m.name), [modelsQuery.data]);

  function reset() { setBrand(""); setModel(""); setTarget(""); setActiveCat("watches"); }

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

  function handleCancel() { reset(); onOpenChange(false); }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); else onOpenChange(o); }}>
      <DialogContent className="max-w-xl bg-surface border-0 p-6 gap-5 [&>button]:hidden">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Add a piece</h2>
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
                onClick={() => { setActiveCat(c); setBrand(""); setModel(""); }}
                className={[
                  "relative flex items-center justify-between rounded-[20px] h-14 pl-5 text-left transition-all font-display font-semibold overflow-hidden",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-surface-2 border border-hairline",
                ].join(" ")}
              >
                <span className="text-base">{CATEGORY_LABELS[c]}</span>
                <img src={CAT_IMG[c]} alt="" className="absolute bottom-0 right-0 h-full w-20 object-contain object-right-bottom" />
              </button>
            );
          })}
        </div>

        {/* Brand */}
        <Field label="Brand">
          <SearchableSelect
            value={brand}
            options={brandOptions}
            placeholder="Choose"
            loading={catalog.isLoading}
            emptyLabel="No brands found"
            onSelect={(v) => { setBrand(v); setModel(""); }}
          />
        </Field>

        {/* Model */}
        <Field label="Piece / Model">
          <SearchableSelect
            value={model}
            options={modelOptions}
            placeholder="Choose"
            disabled={!brand}
            loading={modelsQuery.isLoading}
            emptyLabel="No models available"
            onSelect={(v) => setModel(v)}
          />
        </Field>

        {/* Target price */}
        <Field
          label="Target price (optional)"
          info={
            <div className="text-xs leading-relaxed">
              <div className="text-primary-foreground">The price you're waiting for</div>
              <div className="text-primary-foreground/80">coming soon with live price tracking</div>
            </div>
          }
        >
          <MoneyInput
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder=""
            className="[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
          />
        </Field>

        <div className="flex items-center justify-end gap-4 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="font-display font-semibold text-sm px-3 py-2 hover:opacity-70"
          >
            Cancel
          </button>
          <Button
            disabled={!brand || !model}
            onClick={handleConfirm}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11 disabled:bg-muted-foreground/50 disabled:text-white disabled:opacity-100"
          >
            Add to brand watchlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, info, children,
}: { label: string; info?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
        {info ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="More info">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                {info}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      {children}
    </div>
  );
}

