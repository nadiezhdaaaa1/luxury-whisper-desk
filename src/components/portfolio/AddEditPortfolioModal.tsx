import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/quiz";
import {
  uploadPortfolioPhoto,
  deletePortfolioPhotos,
  type PortfolioInput,
  type PortfolioRow,
} from "@/lib/portfolio";
import { prepareImageForUpload, ImagePrepareError } from "@/lib/image-crop";

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
  photo_path: string | null;
  notes: string;
  purchase_price: string;
  purchase_year: string;
  target_price: string;
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
  photo_path: null,
  notes: "",
  purchase_price: "",
  purchase_year: "",
  target_price: "",
  signal_every_move: true,
  alert_below_enabled: false,
  alert_below_price: "",
  alert_above_enabled: false,
  alert_above_price: "",
};

const CAT_IMG: Record<Category, string> = {
  watches: watchImg.url,
  jewelry: ringImg.url,
  bags: bagImg.url,
};

export function AddEditPortfolioModal({
  open,
  onOpenChange,
  onSubmit,
  initial,
  submitting,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Every object uploaded during this modal session. Anything left here that the
  // saved row doesn't reference is a superseded upload and gets removed.
  const sessionPaths = useRef<string[]>([]);
  const submitted = useRef(false);
  const catalog = useBrandsCatalog();
  const brandsForCategory = (catalog.data ?? []).filter((b) => b.category === form.category);
  const currentBrandSlug = form.brand
    ? (findBrand(catalog.data ?? [], form.brand, form.category)?.slug ?? null)
    : null;
  const modelsQ = useModelsForBrand(currentBrandSlug);

  const validation = validateForm(form);
  const showErr = (k: string) => (submitAttempted || touched[k]) && !!validation.errors[k];
  const errMsg = (k: string) => (showErr(k) ? validation.errors[k] : null);

  const persistedPath = initial?.photo_path ?? null;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTouched({});
    setSubmitAttempted(false);
    sessionPaths.current = [];
    submitted.current = false;
    if (initial) {
      setForm({
        category: initial.category,
        brand: initial.brand,
        model: initial.model ?? "",
        photo_url: initial.photo_signed_url ?? initial.photo_url ?? null,
        photo_path: initial.photo_path ?? null,
        notes: initial.notes ?? "",
        purchase_price: initial.purchase_price != null ? String(initial.purchase_price) : "",
        purchase_year: initial.purchase_year != null ? String(initial.purchase_year) : "",
        target_price: initial.target_price != null ? String(initial.target_price) : "",
        signal_every_move: initial.signal_every_move,
        alert_below_enabled: initial.alert_below_enabled,
        alert_below_price:
          initial.alert_below_price != null ? String(initial.alert_below_price) : "",
        alert_above_enabled: initial.alert_above_enabled,
        alert_above_price:
          initial.alert_above_price != null ? String(initial.alert_above_price) : "",
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

  /** Drop uploads that this session created but the piece no longer points at. */
  function cleanupSessionUploads(keepPath: string | null) {
    const stale = sessionPaths.current.filter((p) => p !== keepPath && p !== persistedPath);
    sessionPaths.current = keepPath ? [keepPath] : [];
    if (stale.length) void deletePortfolioPhotos(stale);
  }

  function handleOpenChange(o: boolean) {
    if (submitting) return;
    if (!o && !submitted.current) cleanupSessionUploads(persistedPath);
    onOpenChange(o);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    // Courtesy first gate; the real ceiling is the resize below plus the
    // bucket's file_size_limit.
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large (max 8 MB).");
      return;
    }
    setError(null);

    setUploading(true);
    const previousPath = form.photo_path;

    // Resize before upload. On failure we abort — never upload the original,
    // or both the bucket ceiling and this bound are defeated.
    let prepared: File;
    try {
      prepared = await prepareImageForUpload(file);
    } catch (e) {
      setError(
        e instanceof ImagePrepareError
          ? e.message
          : "This image couldn't be prepared for upload. Try a JPEG or PNG.",
      );
      setUploading(false);
      return;
    }

    try {
      const res = await uploadPortfolioPhoto(prepared);
      sessionPaths.current.push(res.path);
      setForm((f) => ({ ...f, photo_url: res.url, photo_path: res.path }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
      return;
    }
    setUploading(false);
    // The photo this upload replaced is now superseded.
    if (previousPath && previousPath !== persistedPath) void deletePortfolioPhotos([previousPath]);
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
        const el = document.querySelector<HTMLElement>(
          `[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`,
        );
        el?.focus();
      }
      return;
    }
    const payload: PortfolioInput = {
      category: form.category,
      brand: form.brand.trim(),
      model: form.model.trim() || null,
      photo_url: form.photo_url,
      photo_path: form.photo_path,
      notes: form.notes.trim() || null,
      purchase_price: toNumber(form.purchase_price),
      purchase_year:
        form.purchase_price.trim() !== "" && form.purchase_year.trim() !== ""
          ? Number(form.purchase_year)
          : null,
      target_price: toNumber(form.target_price),
      signal_every_move: true,
      alert_below_enabled: form.alert_below_enabled,
      alert_below_price: form.alert_below_enabled ? toNumber(form.alert_below_price) : null,
      alert_above_enabled: form.alert_above_enabled,
      alert_above_price: form.alert_above_enabled ? toNumber(form.alert_above_price) : null,
    };
    await onSubmit(payload);
    submitted.current = true;
    // Saved: drop any upload the saved piece doesn't reference, including a
    // swapped-out photo that was persisted on the row before this edit.
    const stale = sessionPaths.current.filter((p) => p !== form.photo_path);
    if (persistedPath && persistedPath !== form.photo_path) stale.push(persistedPath);
    sessionPaths.current = [];
    if (stale.length) void deletePortfolioPhotos(stale);
  }

  const isEdit = !!initial;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl bg-surface border-0 p-6 gap-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit piece" : "Add to my portfolio"}
          </DialogTitle>
        </DialogHeader>

        {/* Photo dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className="relative mx-auto w-full max-w-[320px] rounded-2xl border-2 border-dashed border-hairline bg-surface-2/40 hover:bg-surface-2 transition-colors overflow-hidden"
        >
          {form.photo_url ? (
            <div className="relative">
              <img src={form.photo_url} alt="" className="w-full aspect-[4/3] object-cover" />
              <button
                type="button"
                onClick={() => {
                  const cleared = form.photo_path;
                  setForm((f) => ({ ...f, photo_url: null, photo_path: null }));
                  // A photo uploaded in this session and then cleared is a dead object.
                  // A photo already saved on the piece is removed when the edit is saved.
                  if (cleared && cleared !== persistedPath) {
                    sessionPaths.current = sessionPaths.current.filter((p) => p !== cleared);
                    void deletePortfolioPhotos([cleared]);
                  }
                }}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/85 grid place-items-center hover:bg-background"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-background/50 grid place-items-center">
                  <div className="flex items-center gap-2 text-sm text-foreground bg-background rounded-full px-3 py-1.5 shadow-soft">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
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
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const active = c === form.category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  set("category", c);
                  set("brand", "");
                  set("model", "");
                }}
                className={cn(
                  "relative flex items-center justify-between rounded-[20px] h-14 pl-5 text-left transition-all font-display font-semibold overflow-hidden",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-surface-2 border border-hairline",
                )}
              >
                <span className="text-base">{CATEGORY_LABELS[c]}</span>
                <img
                  src={CAT_IMG[c]}
                  alt=""
                  className="absolute bottom-0 right-0 h-full w-20 object-contain object-right-bottom"
                />
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
            onSelect={(v) => {
              set("brand", v);
              set("model", "");
              markTouched("brand");
            }}
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
            className="[&>input]:rounded-[16px] [&>input]:pl-9"
          />
        </Field>

        {form.purchase_price.trim() !== "" ? (
          <Field label="Purchase year (optional)" error={errMsg("purchase_year")}>
            <select
              value={form.purchase_year}
              onChange={(e) => set("purchase_year", e.target.value)}
              onBlur={() => markTouched("purchase_year")}
              className="h-[var(--control-h)] w-full rounded-[16px] bg-card px-4 text-sm border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select year…</option>
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Helps us show how the market price moved since you bought it.
            </p>
          </Field>
        ) : null}

        <Field label="Target sell price (optional)" error={errMsg("target_price")}>
          <MoneyInput
            value={form.target_price}
            onChange={(e) => set("target_price", e.target.value)}
            onBlur={() => markTouched("target_price")}
            placeholder="e.g. 18000"
            className="[&>input]:rounded-[16px] [&>input]:pl-9"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            The price you'd sell at. We'll flag it when the market gets there.
          </p>
        </Field>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Reference, condition, papers…"
            className="min-h-[72px] px-5"
          />
        </Field>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : submitAttempted && !validation.ok ? (
          <p className="text-sm text-destructive">Please fix the highlighted fields.</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
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
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add to portfolio"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label?: string;
  children: React.ReactNode;
  error?: string | null;
  required?: boolean;
}) {
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
  const tp = f.target_price.trim();
  if (tp !== "" && !(Number.isFinite(Number(tp)) && Number(tp) > 0)) {
    errors.target_price = "Enter a valid price.";
  }
  const parsePrice = (s: string) => {
    const t = s.trim();
    if (t === "") return NaN;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };
  let below = NaN,
    above = NaN;
  if (f.alert_below_enabled) {
    below = parsePrice(f.alert_below_price);
    if (!Number.isFinite(below) || below <= 0)
      errors.alert_below_price = "Set a target price above 0.";
  }
  if (f.alert_above_enabled) {
    above = parsePrice(f.alert_above_price);
    if (!Number.isFinite(above) || above <= 0)
      errors.alert_above_price = "Set a target price above 0.";
  }
  if (
    f.alert_below_enabled &&
    f.alert_above_enabled &&
    Number.isFinite(below) &&
    Number.isFinite(above) &&
    below >= above
  ) {
    errors.alert_range = '"Below" target must be lower than "above" target.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function yearOptions(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now; y >= 1970; y--) years.push(y);
  return years;
}
