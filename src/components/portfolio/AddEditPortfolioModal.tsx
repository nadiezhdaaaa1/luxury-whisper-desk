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
import { cropImageToBox, isValidBBox } from "@/lib/image-crop";

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
  purchase_year: string;
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
  purchase_year: "",
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognize = useServerFn(recognizePortfolioPhoto);
  const catalog = useBrandsCatalog();
  const brandsForCategory = (catalog.data ?? []).filter((b) => b.category === form.category);
  const currentBrandSlug = form.brand
    ? findBrand(catalog.data ?? [], form.brand, form.category)?.slug ?? null
    : null;
  const modelsQ = useModelsForBrand(currentBrandSlug);

  const validation = validateForm(form);
  const showErr = (k: string) => (submitAttempted || touched[k]) && !!validation.errors[k];
  const errMsg = (k: string) => (showErr(k) ? validation.errors[k] : null);


  useEffect(() => {
    if (!open) return;
    setError(null);
    setDetected(null);
    setTouched({});
    setSubmitAttempted(false);
    if (initial) {
      setForm({
        category: initial.category,
        brand: initial.brand,
        model: initial.model ?? "",
        photo_url: initial.photo_url ?? null,
        notes: initial.notes ?? "",
        purchase_price: initial.purchase_price != null ? String(initial.purchase_price) : "",
        purchase_year: initial.purchase_year != null ? String(initial.purchase_year) : "",
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
  function markTouched(k: string) {
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
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

        // Auto-crop around the detected product and replace the photo
        if (isValidBBox(result.bbox)) {
          try {
            const cropped = await cropImageToBox(file, result.bbox, {
              padding: 0.12,
              aspect: 4 / 3,
              maxSize: 1600,
              quality: 0.9,
            });
            const uploaded = await uploadPortfolioPhoto(cropped);
            set("photo_url", uploaded.url);
          } catch (cropErr) {
            console.error("[auto-crop] failed", cropErr);
          }
        }
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
    setSubmitAttempted(true);
    if (!validation.ok) {
      // Focus first error field for a11y
      const first = Object.keys(validation.errors)[0];
      if (first) {
        const el = document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`);
        el?.focus();
      }
      return;
    }
    const payload: PortfolioInput = {
      category: form.category,
      brand: form.brand.trim(),
      model: form.model.trim() || null,
      photo_url: form.photo_url,
      notes: form.notes.trim() || null,
      purchase_price: toNumber(form.purchase_price),
      purchase_year: form.purchase_price.trim() !== "" && form.purchase_year.trim() !== ""
        ? Number(form.purchase_year)
        : null,
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

        <Field label="Brand" error={errMsg("brand")} required>
          <SearchableSelect
            value={form.brand}
            options={brandsForCategory.map((b) => b.name)}
            placeholder="Choose"
            loading={catalog.isLoading}
            emptyLabel="No brands found"
            onSelect={(v) => { set("brand", v); set("model", ""); markTouched("brand"); }}
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


        <Field label="Purchase price (optional)" error={errMsg("purchase_price")}>
          <MoneyInput
            value={form.purchase_price}
            onChange={(e) => set("purchase_price", e.target.value)}
            onBlur={() => markTouched("purchase_price")}
            placeholder="e.g. 12000"
            className="[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
          />
        </Field>

        {form.purchase_price.trim() !== "" ? (
          <Field
            label="Purchase year (optional)"
            error={errMsg("purchase_year")}
          >
            <select
              value={form.purchase_year}
              onChange={(e) => set("purchase_year", e.target.value)}
              onBlur={() => markTouched("purchase_year")}
              className="h-12 w-full rounded-[16px] bg-white px-4 text-sm border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select year…</option>
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Helps us show how the market price moved since you bought it.
            </p>
          </Field>
        ) : null}

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
            onChange={(v) => { set("alert_below_enabled", v); if (!v) markTouched("alert_below_price"); }}
          />
          {form.alert_below_enabled ? (
            <Field error={errMsg("alert_below_price")}>
              <MoneyInput
                value={form.alert_below_price}
                onChange={(e) => set("alert_below_price", e.target.value)}
                onBlur={() => markTouched("alert_below_price")}
                placeholder="Target price"
                className="[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
              />
            </Field>
          ) : null}
          <AlertToggle
            id="above"
            label="Alert me when price goes above"
            checked={form.alert_above_enabled}
            onChange={(v) => { set("alert_above_enabled", v); if (!v) markTouched("alert_above_price"); }}
          />
          {form.alert_above_enabled ? (
            <Field error={errMsg("alert_above_price")}>
              <MoneyInput
                value={form.alert_above_price}
                onChange={(e) => set("alert_above_price", e.target.value)}
                onBlur={() => markTouched("alert_above_price")}
                placeholder="Target price"
                className="[&>input]:h-12 [&>input]:rounded-[16px] [&>input]:bg-white [&>input]:pl-9"
              />
            </Field>
          ) : null}
          {errMsg("alert_range") ? (
            <p className="text-xs text-destructive">{errMsg("alert_range")}</p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : submitAttempted && !validation.ok ? (
          <p className="text-sm text-destructive">Please fix the highlighted fields.</p>
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
            disabled={submitting || uploading || (submitAttempted && !validation.ok)}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-6 h-11"
          >
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</>) : isEdit ? "Save changes" : "Add to portfolio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, error, required }: { label?: string; children: React.ReactNode; error?: string | null; required?: boolean }) {
  return (
    <div data-field={label ? label.toLowerCase().split(" ")[0] : undefined}>
      {label ? (
        <label className="block text-xs font-display font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function validateForm(f: FormState): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!f.brand.trim()) errors.brand = "Brand is required.";
  const pp = f.purchase_price.trim();
  if (pp !== "" && !(Number.isFinite(Number(pp)) && Number(pp) >= 0)) {
    errors.purchase_price = "Enter a valid price.";
  }
  const py = f.purchase_year.trim();
  if (py !== "") {
    const yr = Number(py);
    const nowY = new Date().getFullYear();
    if (!Number.isInteger(yr) || yr < 1900 || yr > nowY) {
      errors.purchase_year = "Enter a valid year.";
    }
  }
  const parsePrice = (s: string) => {
    const t = s.trim();
    if (t === "") return NaN;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };
  let below = NaN, above = NaN;
  if (f.alert_below_enabled) {
    below = parsePrice(f.alert_below_price);
    if (!Number.isFinite(below) || below <= 0) errors.alert_below_price = "Set a target price above 0.";
  }
  if (f.alert_above_enabled) {
    above = parsePrice(f.alert_above_price);
    if (!Number.isFinite(above) || above <= 0) errors.alert_above_price = "Set a target price above 0.";
  }
  if (
    f.alert_below_enabled && f.alert_above_enabled &&
    Number.isFinite(below) && Number.isFinite(above) && below >= above
  ) {
    errors.alert_range = '"Below" target must be lower than "above" target.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
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
