import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import {
  uploadPortfolioPhoto,
  type PortfolioInput,
  type PortfolioRow,
} from "@/lib/portfolio";
import { recognizePortfolioPhoto } from "@/lib/portfolio-recognize.functions";
import { track } from "@/lib/analytics";
import { useBrandsCatalog, useModelsForBrand, findBrand } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import watchImg from "@/assets/tabs-watches.png.asset.json";
import ringImg from "@/assets/tabs-jewelry.png.asset.json";
import bagImg from "@/assets/tabs-bags.png.asset.json";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (input: PortfolioInput) => Promise<void> | void;
  initial?: PortfolioRow | null;
  submitting?: boolean;
};

type FormState = {
  category: Category;
  brand: string;
  model: string;
  photo_url: string | null;
  notes: string;
  purchase_price: string;
  signal_every_move: boolean;
  alert_below_enabled: boolean;
  alert_below_price: string;
  alert_above_enabled: boolean;
  alert_above_price: string;
};

const EMPTY: FormState = {
  category: "watches",
  brand: "",
  model: "",
  photo_url: null,
  notes: "",
  purchase_price: "",
  signal_every_move: true,
  alert_below_enabled: false,
  alert_below_price: "",
  alert_above_enabled: false,
  alert_above_price: "",
};

const CONFIDENCE_THRESHOLD = 0.35;

const CAT_IMG: Record<Category, string> = {
  watches: watchImg.url,
  jewelry: ringImg.url,
  bags: bagImg.url,
};

export function AddEditPortfolioModal({ open, onOpenChange, onSubmit, initial, submitting }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [detected, setDetected] = useState<{ brand: string | null; model: string | null; category: Category | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognize = useServerFn(recognizePortfolioPhoto);
  const catalog = useBrandsCatalog();
  const brandsForCategory = (catalog.data ?? []).filter((b) => b.category === form.category);
  const currentBrandSlug = form.brand
    ? findBrand(catalog.data ?? [], form.brand, form.category)?.slug ?? null
    : null;
  const modelsQ = useModelsForBrand(currentBrandSlug);


  useEffect(() => {
    if (!open) return;
    setError(null);
    setDetected(null);
    if (initial) {
      setForm({
        category: initial.category,
        brand: initial.brand,
        model: initial.model ?? "",
        photo_url: initial.photo_url ?? null,
        notes: initial.notes ?? "",
        purchase_price: initial.purchase_price != null ? String(initial.purchase_price) : "",
        signal_every_move: initial.signal_every_move,
        alert_below_enabled: initial.alert_below_enabled,
        alert_below_price: initial.alert_below_price != null ? String(initial.alert_below_price) : "",
        alert_above_enabled: initial.alert_above_enabled,
        alert_above_price: initial.alert_above_price != null ? String(initial.alert_above_price) : "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large (max 8 MB).");
      return;
    }
    setError(null);

    // Upload
    setUploading(true);
    let url: string;
    try {
      const res = await uploadPortfolioPhoto(file);
      url = res.url;
      set("photo_url", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
      return;
    }
    setUploading(false);

    // AI recognition (best-effort, non-blocking suggestion)
    setRecognizing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await recognize({ data: { image_data_url: dataUrl } });
      if (result.ok && result.confidence >= CONFIDENCE_THRESHOLD) {
        setDetected({
          category: result.category,
          brand: result.brand,
          model: result.model,
        });
        // Pre-fill only empty fields — never overwrite what the user typed
        setForm((f) => ({
          ...f,
          category: result.category && !initial ? result.category : f.category,
          brand: f.brand.trim() === "" && result.brand ? result.brand : f.brand,
          model: f.model.trim() === "" && result.model ? result.model : f.model,
        }));
        track("portfolio_photo_recognized", {
          category: result.category,
          brand: result.brand,
          confidence: result.confidence,
        });
      } else {
        setDetected(null);
      }
    } catch (e) {
      console.error("[recognize] failed", e);
      setDetected(null);
    } finally {
      setRecognizing(false);
    }
  }

  function toNumber(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function handleSubmit() {
    setError(null);
    if (!form.brand.trim()) { setError("Brand is required."); return; }
    const payload: PortfolioInput = {
      category: form.category,
      brand: form.brand.trim(),
      model: form.model.trim() || null,
      photo_url: form.photo_url,
      notes: form.notes.trim() || null,
      purchase_price: toNumber(form.purchase_price),
      signal_every_move: true,
      alert_below_enabled: form.alert_below_enabled,
      alert_below_price: form.alert_below_enabled ? toNumber(form.alert_below_price) : null,
      alert_above_enabled: form.alert_above_enabled,
      alert_above_price: form.alert_above_enabled ? toNumber(form.alert_above_price) : null,
    };
    await onSubmit(payload);
  }

  const isEdit = !!initial;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-xl bg-[#FCFAF6] border-0 p-6 gap-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit piece" : "Add to my portfolio"}
          </DialogTitle>
        </DialogHeader>

        {/* Photo dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className="relative rounded-2xl border-2 border-dashed border-hairline bg-surface-2/40 hover:bg-surface-2 transition-colors overflow-hidden"
        >
          {form.photo_url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.photo_url} alt="" className="w-full aspect-[4/3] object-cover" />
              <button
                type="button"
                onClick={() => { set("photo_url", null); setDetected(null); }}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/85 grid place-items-center hover:bg-background"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
              {(recognizing || uploading) && (
                <div className="absolute inset-0 bg-background/50 grid place-items-center">
                  <div className="flex items-center gap-2 text-sm text-foreground bg-background rounded-full px-3 py-1.5 shadow-soft">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploading ? "Uploading…" : "Recognizing…"}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
              <div className="text-sm font-medium">
                {uploading ? "Uploading…" : "Upload or drop a photo"}
              </div>
              <div className="text-xs">JPG or PNG · up to 8 MB</div>
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {detected && (detected.brand || detected.model || detected.category) ? (
          <div className="flex items-start gap-2 rounded-lg bg-champagne-soft/60 border border-hairline px-3 py-2 text-xs">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Detected: </span>
              {[
                detected.category ? CATEGORY_LABELS[detected.category] : null,
                detected.brand,
                detected.model,
              ].filter(Boolean).join(" · ")} — edit if needed.
            </p>
          </div>
        ) : null}

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const active = c === form.category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { set("category", c); set("brand", ""); set("model", ""); }}
                className={cn(
                  "relative flex items-center justify-between rounded-[20px] h-14 pl-5 text-left transition-all font-display font-semibold overflow-hidden",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-surface-2 border border-hairline",
                )}
              >
                <span className="text-base">{CATEGORY_LABELS[c]}</span>
                <img src={CAT_IMG[c]} alt="" className="absolute bottom-0 right-0 h-full w-20 object-contain object-right-bottom" />
              </button>
            );
          })}
        </div>

        <Field label="Brand">
          <SearchableSelect
            value={form.brand}
            options={brandsForCategory.map((b) => b.name)}
            placeholder="Choose"
            loading={catalog.isLoading}
            emptyLabel="No brands found"
            onSelect={(v) => { set("brand", v); set("model", ""); }}
          />
        </Field>

        <Field label="Piece / Model">
          <SearchableSelect
            value={form.model}
            options={(modelsQ.data ?? []).map((m) => m.name)}
            placeholder="Choose"
            disabled={!form.brand}
            loading={modelsQ.isLoading}
            emptyLabel="No models available"
            onSelect={(v) => set("model", v)}
          />
        </Field>


        <Field label="Purchase price (optional)">
          <MoneyInput
            value={form.purchase_price}
            onChange={(e) => set("purchase_price", e.target.value)}
            placeholder="e.g. 12000"
            className="[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Reference, condition, papers…"
            className="bg-white min-h-[72px] px-5"
          />
        </Field>

        <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
          <AlertToggle
            id="below"
            label="Alert me when price goes below"
            checked={form.alert_below_enabled}
            onChange={(v) => set("alert_below_enabled", v)}
          />
          {form.alert_below_enabled ? (
            <MoneyInput
              value={form.alert_below_price}
              onChange={(e) => set("alert_below_price", e.target.value)}
              placeholder="Target price"
              className="ml-6 [&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
            />
          ) : null}
          <AlertToggle
            id="above"
            label="Alert me when price goes above"
            checked={form.alert_above_enabled}
            onChange={(v) => set("alert_above_enabled", v)}
          />
          {form.alert_above_enabled ? (
            <MoneyInput
              value={form.alert_above_price}
              onChange={(e) => set("alert_above_price", e.target.value)}
              placeholder="Target price"
              className="ml-6 [&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
            />
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-full font-display font-semibold px-6 h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || !form.brand.trim()}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11"
          >
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</>) : isEdit ? "Save changes" : "Add to portfolio"}
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

function AlertToggle({
  id, label, checked, onChange,
}: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm text-foreground cursor-pointer">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
