import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import {
  Check,
  ChevronLeft,
  Search,
  X,
  Watch,
  Gem,
  ShoppingBag,
  Crown,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EMPTY_ANSWERS,
  ROLES,
  ROLE_LABELS,
  SEGMENTS,
  SEGMENT_LABELS,
  type Category,
  type QuizAnswers,
  type Role,
  type Segment,
} from "@/lib/quiz";
import {
  useBrandsCatalog,
  tierSetForSegments,
  type BrandRow,
} from "@/lib/catalog";
import { FREE_ACTIVE_CAP } from "@/lib/watchlist";
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
const QUIZ_BRAND_CAP = FREE_ACTIVE_CAP;

// Icons per tier / role
import segmentLuxuryAsset from "@/assets/segment-luxury.png.asset.json";
import segmentMidAsset from "@/assets/segment-mid.png.asset.json";
import segmentMassAsset from "@/assets/segment-mass.png.asset.json";
import roleCollectorAsset from "@/assets/role-collector.png.asset.json";
import roleResellerAsset from "@/assets/role-reseller.png.asset.json";
import roleBuyerAsset from "@/assets/role-buyer.png.asset.json";

const SEGMENT_IMAGES: Record<Segment, string> = {
  luxury_invest: segmentLuxuryAsset.url,
  mid_market: segmentMidAsset.url,
  mass_market: segmentMassAsset.url,
};

const CATEGORY_ICONS: Record<Category, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

const ROLE_IMAGES: Record<Role, string> = {
  collector: roleCollectorAsset.url,
  reseller: roleResellerAsset.url,
  buyer: roleBuyerAsset.url,
};


// A brand selection is encoded as `${name} — ${CategoryLabel}` so
// deselecting a category cleanly clears its brands, and duplicates
// like Cartier — Watches / Cartier — Jewelry can coexist.
const SEP = " — ";
const encodeBrand = (name: string, cat: Category) =>
  `${name}${SEP}${CATEGORY_LABELS[cat]}`;
const brandCategoryLabel = (b: string): string | null => {
  const i = b.lastIndexOf(SEP);
  return i === -1 ? null : b.slice(i + SEP.length);
};
const brandDisplayName = (b: string): string => {
  const i = b.lastIndexOf(SEP);
  return i === -1 ? b : b.slice(0, i);
};

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
    if (step === 2)
      return (
        answers.categories.length > 0 &&
        answers.brands.length > 0 &&
        answers.brands.length <= QUIZ_BRAND_CAP
      );
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
      {/* Header + progress */}
      <div className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-2">
          <div className="flex items-center justify-center">
            <Logo className="text-[28px]" />
          </div>
          <div className="mt-5 flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i < step ? "bg-primary" : "bg-primary/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-2 pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-3 sm:px-4">
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
          {attempted && !stepValid && !(step === 2 && answers.brands.length > QUIZ_BRAND_CAP) ? (
            <p className="mt-4 text-xs text-destructive">
              {step === 1
                ? "Pick at least one tier to continue."
                : step === 2
                ? "Pick at least one category and one brand."
                : "Choose the option that describes you best."}
            </p>
          ) : null}

          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="text-primary font-medium hover:underline px-2"
            >
              Back to site
            </button>

            <div className="flex items-center gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={back}
                  className="btn-ghost inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : null}
              <button
                onClick={next}
                disabled={step === 2 && answers.brands.length > QUIZ_BRAND_CAP}
                className="btn-primary min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === TOTAL_STEPS ? (submitLabel ?? "Finish") : "Continue"}
              </button>
            </div>
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
            <AlertDialogCancel className="btn-ghost mt-0">Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate({ to: "/" })} className="btn-primary">
              Leave quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Big Card primitive ────────────────────────────────────────────────────
function BigCard({
  active,
  onClick,
  icon: Icon,
  imageSrc,
  label,
  indicator,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Crown;
  imageSrc?: string;
  label: string;
  indicator: "check" | "radio";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-between rounded-2xl border bg-white p-6 pt-8 h-48 sm:h-56 text-center transition-all ${
        active
          ? "border-primary shadow-lift"
          : "border-hairline hover:border-primary/60"
      }`}
    >
      <span
        className={`absolute top-3 right-3 inline-flex h-5 w-5 items-center justify-center border ${
          indicator === "check" ? "rounded-md" : "rounded-full"
        } ${
          active
            ? "bg-primary border-primary text-white"
            : "border-hairline bg-white"
        }`}
      >
        {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <div className="flex-1 flex items-center justify-center">
        {imageSrc ? (
          <img src={imageSrc} alt="" className="h-20 w-20 object-contain" />
        ) : (
          <span
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
              active ? "bg-primary/15 text-primary" : "bg-surface-2 text-primary/70"
            }`}
          >
            {Icon ? <Icon className="h-7 w-7" /> : null}
          </span>
        )}
      </div>
      <span className="font-display text-base font-medium leading-tight">
        {label}
      </span>
    </button>
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
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {SEGMENTS.map((s) => (
          <BigCard
            key={s}
            active={value.includes(s)}
            onClick={() => toggle(s)}
            imageSrc={SEGMENT_IMAGES[s]}
            label={SEGMENT_LABELS[s]}
            indicator="check"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────
const COMING_NEXT: Partial<Record<Category, string>> = {};

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
  const catalog = useBrandsCatalog();
  const catalogRows: BrandRow[] = catalog.data ?? [];

  const brandsByCat = useMemo(() => {
    const map = new Map<Category, BrandRow[]>();
    for (const c of CATEGORIES) map.set(c, []);
    for (const b of catalogRows) map.get(b.category)?.push(b);
    return map;
  }, [catalogRows]);

  function suggestedFor(cat: Category): string[] {
    const tiers = tierSetForSegments(segments);
    return (brandsByCat.get(cat) ?? [])
      .filter((b) => tiers.size === 0 || tiers.has(b.tier))
      .slice(0, 6)
      .map((b) => encodeBrand(b.name, cat));
  }

  function toggleCategory(c: Category) {
    if (categories.includes(c)) {
      onCategoriesChange(categories.filter((x) => x !== c));
      onBrandsChange(
        brands.filter((b) => brandCategoryLabel(b) !== CATEGORY_LABELS[c]),
      );
      return;
    }
    const nextCats = [...categories, c];
    onCategoriesChange(nextCats);
    const additions = suggestedFor(c).filter((b) => !brands.includes(b));
    if (additions.length) onBrandsChange([...brands, ...additions]);
  }

  function toggleBrand(encoded: string) {
    onBrandsChange(
      brands.includes(encoded)
        ? brands.filter((x) => x !== encoded)
        : [...brands, encoded],
    );
  }

  const candidateBrands = useMemo(() => {
    const cats = categories.length > 0 ? categories : [...CATEGORIES];
    const out: { encoded: string; name: string; category: Category }[] = [];
    for (const c of cats) {
      for (const b of brandsByCat.get(c) ?? []) {
        out.push({ encoded: encodeBrand(b.name, c), name: b.name, category: c });
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, brandsByCat]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidateBrands;
    return candidateBrands.filter((b) => b.name.toLowerCase().includes(q));
  }, [candidateBrands, query]);

  const canAddCustom =
    query.trim().length > 0 &&
    categories.length > 0 &&
    !candidateBrands.some(
      (b) => b.name.toLowerCase() === query.trim().toLowerCase(),
    );

  function addCustom() {
    const v = query.trim();
    if (!v || categories.length === 0) return;
    const encoded = encodeBrand(v, categories[0]);
    if (!brands.includes(encoded)) onBrandsChange([...brands, encoded]);
    setQuery("");
  }

  return (
    <div>
      <StepHeader
        eyebrow="Step 2"
        title="Pick categories and brands"
        subtitle="We use these to build your watchlist and signals."
      />

      {/* Categories */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Categories
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {CATEGORIES.map((c) => {
            const active = categories.includes(c);
            const Icon = CATEGORY_ICONS[c];
            const badge = COMING_NEXT[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-3 py-4 transition-colors ${
                  active
                    ? "border-primary shadow-soft"
                    : "border-hairline hover:border-primary/60"
                }`}
              >
                {badge ? (
                  <span
                    className="absolute top-2 right-2 text-[9px] font-display font-semibold px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-[0.05em]"
                    style={{
                      color: "var(--primary)",
                      backgroundColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}
                  >
                    {badge}
                  </span>
                ) : null}
                {active ? (
                  <span
                    className="absolute top-2 left-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-2 text-primary/70"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-sm font-medium">
                  {CATEGORY_LABELS[c]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brands */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2 gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Brands ({brands.length})
          </span>
          <span className={`text-[11px] font-medium ${brands.length > QUIZ_BRAND_CAP ? "text-primary" : "text-muted-foreground/70"}`}>
            {brands.length} / {QUIZ_BRAND_CAP}
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
            placeholder={
              categories.length === 0
                ? "Pick a category first"
                : "Search brands (or type to add your own)"
            }
            className="pl-9 shadow-none rounded-2xl h-11 bg-white border-hairline focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        {brands.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brands.map((b) => {
              const catLabel = brandCategoryLabel(b);
              const cat = (Object.keys(CATEGORY_LABELS) as Category[]).find(
                (k) => CATEGORY_LABELS[k] === catLabel,
              );
              const Icon = cat ? CATEGORY_ICONS[cat] : null;
              return (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/40 pl-2 pr-1 py-1 text-xs"
                >
                  {Icon ? <Icon className="h-3 w-3 text-primary" /> : null}
                  <span>{brandDisplayName(b)}</span>
                  <button
                    type="button"
                    onClick={() => toggleBrand(b)}
                    aria-label={`Remove ${b}`}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}

        {brands.length > QUIZ_BRAND_CAP ? (
          <div
            role="status"
            className="mt-3 rounded-xl bg-primary px-3 py-2 text-sm text-white"
          >
            You can watch {QUIZ_BRAND_CAP} brands on the free plan — remove {brands.length - QUIZ_BRAND_CAP} to continue.
          </div>
        ) : null}


        {/* Scroll container matching hero card backdrop */}
        <div className="mt-4 rounded-2xl border border-hairline p-4 overflow-y-auto max-h-80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {canAddCustom ? (
              <button
                type="button"
                onClick={addCustom}
                className="col-span-full text-left rounded-xl border border-dashed border-primary px-3 py-2 text-sm bg-white/80 hover:bg-white"
              >
                + Add "{query.trim()}"
              </button>
            ) : null}
            {filtered.map((b) => {
              const active = brands.includes(b.encoded);
              const Icon = CATEGORY_ICONS[b.category];
              return (
                <button
                  key={b.encoded}
                  type="button"
                  onClick={() => toggleBrand(b.encoded)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors bg-white ${
                    active
                      ? "border-primary"
                      : "border-hairline hover:border-primary/60"
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border shrink-0 ${
                      active
                        ? "bg-primary border-primary text-white"
                        : "border-hairline"
                    }`}
                  >
                    {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="truncate flex-1">{b.name}</span>
                </button>
              );
            })}
            {filtered.length === 0 && !canAddCustom ? (
              <p className="col-span-full text-xs text-muted-foreground py-4 text-center">
                {categories.length === 0
                  ? "Pick a category above to see brands."
                  : "No matches. Try a different search."}
              </p>
            ) : null}
          </div>
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
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {ROLES.map((r) => (
          <BigCard
            key={r}
            active={value === r}
            onClick={() => onChange(r)}
            imageSrc={ROLE_IMAGES[r]}
            label={ROLE_LABELS[r]}
            indicator="check"
          />
        ))}
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
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
        {title}
      </h2>
      <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
    </div>
  );
}
