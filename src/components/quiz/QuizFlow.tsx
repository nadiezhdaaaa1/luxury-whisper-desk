import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Search, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  BRAND_CATALOG,
  CATEGORIES,
  CATEGORY_LABELS,
  EMPTY_ANSWERS,
  ROLES,
  ROLE_LABELS,
  SEGMENTS,
  SEGMENT_LABELS,
  suggestedBrands,
  type Category,
  type QuizAnswers,
  type Role,
  type Segment,
} from "@/lib/quiz";
import { track } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  mode: "landing" | "in-app";
  initial?: QuizAnswers;
  onChange?: (a: QuizAnswers) => void;
  onComplete: (a: QuizAnswers) => void;
  submitLabel?: string;
};

const TOTAL_STEPS = 3;

export function QuizFlow({ mode, initial, onChange, onComplete, submitLabel }: Props) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<QuizAnswers>(initial ?? EMPTY_ANSWERS);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [attempted, setAttempted] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    track("quiz_start", { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track("quiz_step", { mode, step });
  }, [step, mode]);

  useEffect(() => {
    onChange?.(answers);
  }, [answers, onChange]);

  function update<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const stepValid = useMemo(() => {
    if (step === 1) return answers.segments.length > 0;
    if (step === 2) return answers.categories.length > 0 && answers.brands.length > 0;
    return answers.role !== null;
  }, [step, answers]);

  function next() {
    if (!stepValid) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    if (step < TOTAL_STEPS) setStep(((step + 1) as 1 | 2 | 3));
    else onComplete(answers);
  }

  function back() {
    setAttempted(false);
    if (step > 1) setStep(((step - 1) as 1 | 2 | 3));
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Progress + top bar */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-hairline">
        <div className="mx-auto w-full max-w-2xl px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <span
              className="text-sm uppercase tracking-[0.05em] text-primary"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <span className="font-semibold">LUX</span>
              <span className="font-normal">TRACKER</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {step} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="mt-3 h-1 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
        <div className="min-h-[420px]">
          {step === 1 ? (
            <StepSegments
              value={answers.segments}
              onChange={(v) => update("segments", v)}
            />
          ) : step === 2 ? (
            <StepCategoriesBrands
              segments={answers.segments}
              categories={answers.categories}
              brands={answers.brands}
              onCategoriesChange={(v) => update("categories", v)}
              onBrandsChange={(v) => update("brands", v)}
            />
          ) : (
            <StepRole value={answers.role} onChange={(v) => update("role", v)} />
          )}
          {attempted && !stepValid ? (
            <p className="mt-4 text-xs text-destructive">
              {step === 1
                ? "Pick at least one segment to continue."
                : step === 2
                ? "Pick at least one category and one brand."
                : "Choose the option that describes you best."}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="btn-ghost min-w-[140px]"
            >
              Cancel
            </button>
            <button onClick={next} className="btn-primary min-w-[140px]">
              {step === TOTAL_STEPS ? (submitLabel ?? "Finish") : "Continue"}
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won't be saved and you'll be taken back to the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate({ to: "/" })}>
              Leave quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Step 1 ────────────────────────────────────────────────────────────────
function StepSegments({
  value,
  onChange,
}: {
  value: Segment[];
  onChange: (v: Segment[]) => void;
}) {
  function toggle(s: Segment) {
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  }
  return (
    <div>
      <StepHeader
        eyebrow="Step 1"
        title="Which brand tier interests you?"
        subtitle="Choose one or more. This tunes signals and recommended brands."
      />
      <div className="mt-8 grid gap-3">
        {SEGMENTS.map((s) => {
          const active = value.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-hairline hover:border-champagne hover:bg-surface"
              }`}
            >
              <span className="font-display text-base font-medium">
                {SEGMENT_LABELS[s]}
              </span>
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                  active ? "bg-primary border-primary text-primary-foreground" : "border-hairline"
                }`}
              >
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────
function StepCategoriesBrands({
  segments,
  categories,
  brands,
  onCategoriesChange,
  onBrandsChange,
}: {
  segments: Segment[];
  categories: Category[];
  brands: string[];
  onCategoriesChange: (v: Category[]) => void;
  onBrandsChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  function toggleCategory(c: Category) {
    const next = categories.includes(c)
      ? categories.filter((x) => x !== c)
      : [...categories, c];
    onCategoriesChange(next);
    if (brands.length === 0 && next.length > 0) {
      onBrandsChange(suggestedBrands(next, segments).slice(0, 6));
    }
  }

  function toggleBrand(b: string) {
    onBrandsChange(brands.includes(b) ? brands.filter((x) => x !== b) : [...brands, b]);
  }

  const candidateBrands = useMemo(() => {
    const set = new Set<string>();
    const cats = categories.length > 0 ? categories : [...CATEGORIES];
    for (const c of cats) BRAND_CATALOG[c].forEach((b) => set.add(b.name));
    return Array.from(set).sort();
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidateBrands;
    return candidateBrands.filter((b) => b.toLowerCase().includes(q));
  }, [candidateBrands, query]);

  const canAddCustom =
    query.trim().length > 0 &&
    !candidateBrands.some((b) => b.toLowerCase() === query.trim().toLowerCase()) &&
    !brands.some((b) => b.toLowerCase() === query.trim().toLowerCase());

  function addCustom() {
    const v = query.trim();
    if (!v) return;
    onBrandsChange([...brands, v]);
    setQuery("");
  }

  return (
    <div>
      <StepHeader
        eyebrow="Step 2"
        title="Pick categories and brands"
        subtitle="We use these to build your watchlist and signals."
      />
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-display font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-hairline hover:border-champagne"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Brands ({brands.length})
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAddCustom) {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Search brands (or type to add your own)"
            className="pl-9 shadow-none rounded-2xl h-11 bg-background border-hairline focus-visible:ring-0 focus-visible:border-champagne"
          />
        </div>

        {brands.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 pl-3 pr-1 py-1 text-xs"
              >
                {b}
                <button
                  type="button"
                  onClick={() => toggleBrand(b)}
                  aria-label={`Remove ${b}`}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
          {canAddCustom ? (
            <button
              type="button"
              onClick={addCustom}
              className="col-span-full text-left rounded-2xl border border-dashed border-champagne px-3 py-2 text-sm hover:bg-surface"
            >
              + Add “{query.trim()}”
            </button>
          ) : null}
          {filtered.map((b) => {
            const active = brands.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBrand(b)}
                className={`rounded-2xl border px-3 py-2 text-sm text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-hairline hover:border-champagne hover:bg-surface"
                }`}
              >
                {b}
              </button>
            );
          })}
          {filtered.length === 0 && !canAddCustom ? (
            <p className="col-span-full text-xs text-muted-foreground py-4 text-center">
              No matches. Pick a category above.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 ────────────────────────────────────────────────────────────────
function StepRole({
  value,
  onChange,
}: {
  value: Role | null;
  onChange: (v: Role) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 3"
        title="How do you shop?"
        subtitle="This shapes the signals and reports we send you."
      />
      <div className="mt-8 grid gap-3">
        {ROLES.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-hairline hover:border-champagne hover:bg-surface"
              }`}
            >
              <span className="font-display text-base font-medium">
                {ROLE_LABELS[r]}
              </span>
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                  active ? "bg-primary border-primary text-primary-foreground" : "border-hairline"
                }`}
              >
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-champagne">
        {eyebrow}
      </div>
      <h1 className="mt-2 font-display text-2xl sm:text-3xl font-medium tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
