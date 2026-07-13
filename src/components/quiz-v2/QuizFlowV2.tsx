// V2 quiz flow — self-contained. Steps: Intro → Categories+Brands (global search) → Role.
// Tier (segments) is INFERRED from the brand picks via the catalog.
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
  FileCheck,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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
import { BrandMarquee } from "@/components/landing/BrandMarquee";
import { useBrandsCatalog, type BrandRow } from "@/lib/catalog";
import { FREE_ACTIVE_CAP } from "@/lib/watchlist";
import { track } from "@/lib/analytics";
import {
  CATEGORIES_V2,
  CATEGORY_LABELS_V2,
  EMPTY_ANSWERS_V2,
  ROLES_V2,
  ROLE_LABELS_V2,
  brandCategoryLabelV2,
  brandDisplayNameV2,
  encodeBrandV2,
  type CategoryV2,
  type QuizAnswersV2,
  type RoleV2,
  type SegmentV2,
} from "@/lib/quiz-v2";

import roleCollectorAsset from "@/assets/role-collector.png.asset.json";
import roleResellerAsset from "@/assets/role-reseller.png.asset.json";
import roleBuyerAsset from "@/assets/role-buyer.png.asset.json";
import tabsWatchesAsset from "@/assets/tabs-watches.png.asset.json";
import tabsJewelryAsset from "@/assets/tabs-jewelry.png.asset.json";
import tabsBagsAsset from "@/assets/tabs-bags.png.asset.json";

type Props = {
  mode: "landing" | "in-app";
  initial?: QuizAnswersV2;
  onChange?: (a: QuizAnswersV2) => void;
  onComplete: (a: QuizAnswersV2) => void;
  submitLabel?: string;
};

const TOTAL_STEPS = 3;
const PROGRESS_SEGMENTS = 2; // welcome is not counted; counted steps are picks + role
const QUIZ_BRAND_CAP = FREE_ACTIVE_CAP;

const CATEGORY_ICONS: Record<CategoryV2, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

const ROLE_IMAGES: Record<RoleV2, string> = {
  collector: roleCollectorAsset.url,
  reseller: roleResellerAsset.url,
  buyer: roleBuyerAsset.url,
};

export function QuizFlowV2({ mode, initial, onChange, onComplete, submitLabel }: Props) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<QuizAnswersV2>(initial ?? EMPTY_ANSWERS_V2);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [attempted, setAttempted] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const catalog = useBrandsCatalog();
  const catalogRows: BrandRow[] = catalog.data ?? [];

  useEffect(() => {
    track("quiz_v2_start", { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track("quiz_v2_step", { mode, step });
  }, [step, mode]);

  // Re-derive inferred segments (tier) from current brand picks + catalog.
  const inferredSegments = useMemo<SegmentV2[]>(() => {
    if (answers.brands.length === 0) return [];
    const tiers = new Set<SegmentV2>();
    for (const encoded of answers.brands) {
      const i = encoded.lastIndexOf(" — ");
      const name = i === -1 ? encoded : encoded.slice(0, i);
      const catLabel = i === -1 ? null : encoded.slice(i + 3);
      const cat = catLabel
        ? (Object.keys(CATEGORY_LABELS_V2) as CategoryV2[]).find(
            (k) => CATEGORY_LABELS_V2[k] === catLabel,
          )
        : null;
      const row = catalogRows.find(
        (b) => b.name === name && (cat == null || b.category === cat),
      );
      if (row) tiers.add(row.tier as SegmentV2);
    }
    // Fallback: if no tier resolved (custom brand), default to mid_market.
    if (tiers.size === 0 && answers.brands.length > 0) tiers.add("mid_market");
    return [...tiers];
  }, [answers.brands, catalogRows]);

  useEffect(() => {
    setAnswers((a) =>
      a.segments.length === inferredSegments.length &&
      a.segments.every((s) => inferredSegments.includes(s))
        ? a
        : { ...a, segments: inferredSegments },
    );
  }, [inferredSegments]);

  useEffect(() => {
    onChange?.(answers);
  }, [answers, onChange]);

  function update<K extends keyof QuizAnswersV2>(key: K, value: QuizAnswersV2[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const stepValid = useMemo(() => {
    if (step === 1) return true; // intro
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
    else onComplete({ ...answers, segments: inferredSegments });
  }

  function back() {
    setAttempted(false);
    if (step > 1) setStep(((step - 1) as 1 | 2 | 3));
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-2">
          <div className="flex items-center justify-center">
            <Logo className="text-[28px]" />
          </div>
          <div className="mt-5 flex items-center gap-1.5">
            {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i < step - 1 ? "bg-primary" : "bg-primary/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-3xl px-2 pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-3 sm:px-4">
          {step === 1 ? (
            <StepIntro />
          ) : step === 2 ? (
            <StepPicks
              categories={answers.categories}
              brands={answers.brands}
              onCategoriesChange={(v) => update("categories", v)}
              onBrandsChange={(v) => update("brands", v)}
              catalogRows={catalogRows}
              inferredSegments={inferredSegments}
            />
          ) : (
            <StepRole value={answers.role} onChange={(v) => update("role", v)} />
          )}

          {attempted && !stepValid && !(step === 2 && answers.brands.length > QUIZ_BRAND_CAP) ? (
            <p className="mt-4 text-xs text-destructive">
              {step === 2
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
                {step === TOTAL_STEPS
                  ? submitLabel ?? "Finish"
                  : step === 1
                  ? "Let's go"
                  : "Continue"}
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

// ─── Step 1 — Intro ────────────────────────────────────────────────────────
function StepIntro() {
  return (
    <>
      <div className="max-w-3xl">
        <span className="eyebrow">Starting with PriceYou</span>
        <h2 className="mt-3 font-display text-[32px] font-medium tracking-tight leading-[1.15]">
          Let&apos;s build your personalized watchlist
        </h2>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          Two quick questions. Pick your categories and brands, tell us how you shop, and
          we&apos;ll set up a dashboard tuned to what you actually care about.
        </p>
      </div>
      <div className="mt-10">
        <BrandMarquee compact />
      </div>
      <div className="max-w-3xl mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-left">
          <IntroColumn
            icon={<FileCheck className="h-6 w-6 text-white" />}
            title="Track brands"
            body="Get prices and signals for all the brands you follow"
            circleClass="bg-[#7b2d3b]"
          />
          <IntroColumn
            icon={<LayoutGrid className="h-6 w-6 text-white" />}
            title="Any category"
            body="Choose watches, jewelry, or bags — or mix them all"
            circleClass="bg-primary"
          />
          <IntroColumn
            icon={<Layers className="h-6 w-6 text-white" />}
            title="No limits"
            body="Mix luxury, mid, and mass — track whatever you actually want"
            circleClass="bg-positive"
          />
        </div>
      </div>
    </>
  );
}

function IntroColumn({
  icon,
  title,
  body,
  circleClass,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  circleClass: string;
}) {
  return (
    <div>
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${circleClass}`}
      >
        {icon}
      </div>
      <div className="mt-3 font-display text-base font-medium text-foreground">{title}</div>
      <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</div>
    </div>
  );
}

// ─── Step 2 — Categories + Brands (global search across all cats) ─────────
const CATEGORY_IMAGES: Record<CategoryV2, string> = {
  watches: tabsWatchesAsset.url,
  jewelry: tabsJewelryAsset.url,
  bags: tabsBagsAsset.url,
};

type TierFilter = "all" | "luxury_invest" | "mid_market" | "mass_market";
const TIER_FILTERS: { id: TierFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "luxury_invest", label: "Luxury / Investment" },
  { id: "mid_market", label: "Mid-market" },
  { id: "mass_market", label: "Mass-market" },
];

function StepPicks({
  categories,
  brands,
  onCategoriesChange,
  onBrandsChange,
  catalogRows,
}: {
  categories: CategoryV2[];
  brands: string[];
  onCategoriesChange: (v: CategoryV2[]) => void;
  onBrandsChange: (v: string[]) => void;
  catalogRows: BrandRow[];
  inferredSegments: SegmentV2[];
}) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");

  function toggleCategory(c: CategoryV2) {
    if (categories.includes(c)) {
      onCategoriesChange(categories.filter((x) => x !== c));
      onBrandsChange(
        brands.filter((b) => brandCategoryLabelV2(b) !== CATEGORY_LABELS_V2[c]),
      );
    } else {
      onCategoriesChange([...categories, c]);
    }
  }

  function toggleBrand(encoded: string) {
    onBrandsChange(
      brands.includes(encoded)
        ? brands.filter((x) => x !== encoded)
        : [...brands, encoded],
    );
  }

  const allCandidates = useMemo(() => {
    return catalogRows
      .map((b) => ({
        encoded: encodeBrandV2(b.name, b.category as CategoryV2),
        name: b.name,
        category: b.category as CategoryV2,
        tier: b.tier as TierFilter,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allCandidates;
    if (tier !== "all") list = list.filter((b) => b.tier === tier);
    if (!q) {
      if (categories.length === 0) return [];
      return list.filter((b) => categories.includes(b.category));
    }
    return list.filter((b) => b.name.toLowerCase().includes(q));
  }, [allCandidates, query, categories, tier]);

  const canAddCustom =
    query.trim().length > 0 &&
    categories.length > 0 &&
    !allCandidates.some((b) => b.name.toLowerCase() === query.trim().toLowerCase());

  function addCustom() {
    const v = query.trim();
    if (!v || categories.length === 0) return;
    const encoded = encodeBrandV2(v, categories[0]);
    if (!brands.includes(encoded)) onBrandsChange([...brands, encoded]);
    setQuery("");
  }

  return (
    <div>
      <StepHeader
        eyebrow="Step 1"
        title="Pick brands to follow"
        subtitle="Get a heads-up on price moves, new collections, and discounts for the brands you pick"
      />

      {/* Categories */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Categories
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {CATEGORIES_V2.map((c) => {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={active}
                className={`group relative flex items-center justify-between rounded-2xl border pl-4 pr-2 h-16 overflow-hidden transition-colors ${
                  active
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-hairline text-foreground hover:border-primary/60"
                }`}
              >
                <span className="font-display text-base font-medium">
                  {CATEGORY_LABELS_V2[c]}
                </span>
                <img
                  src={CATEGORY_IMAGES[c]}
                  alt=""
                  aria-hidden
                  className="absolute bottom-0 right-0 h-16 w-auto object-contain object-right-bottom"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiers */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Tiers
        </div>
        <div className="flex flex-wrap gap-2">
          {TIER_FILTERS.map((t) => {
            const active = tier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 h-10 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-hairline text-foreground hover:border-primary/60"
                }`}
              >
                {t.label}
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
          <span
            className={`text-[11px] font-medium ${
              brands.length > QUIZ_BRAND_CAP
                ? "text-primary"
                : "text-muted-foreground/70"
            }`}
          >
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
            placeholder="Search any brand — across all categories"
            className="pl-9 shadow-none rounded-2xl h-11 bg-white border-hairline focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        {brands.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brands.map((b) => {
              const catLabel = brandCategoryLabelV2(b);
              const cat = (Object.keys(CATEGORY_LABELS_V2) as CategoryV2[]).find(
                (k) => CATEGORY_LABELS_V2[k] === catLabel,
              );
              const Icon = cat ? CATEGORY_ICONS[cat] : null;
              return (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/40 pl-2 pr-1 py-1 text-xs"
                >
                  {Icon ? <Icon className="h-3 w-3 text-primary" /> : null}
                  <span>{brandDisplayNameV2(b)}</span>
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
            You can watch {QUIZ_BRAND_CAP} brands on the free plan — remove{" "}
            {brands.length - QUIZ_BRAND_CAP} to continue.
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-hairline p-4 overflow-y-auto max-h-96">
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
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground shrink-0">
                    {CATEGORY_LABELS_V2[b.category]}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && !canAddCustom ? (
              <p className="col-span-full text-xs text-muted-foreground py-4 text-center">
                {categories.length === 0 && !query
                  ? "Pick a category or search for any brand."
                  : "No matches. Try a different search."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Step 3 — Role ────────────────────────────────────────────────────────
function StepRole({
  value,
  onChange,
}: {
  value: RoleV2 | null;
  onChange: (v: RoleV2) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Step 2"
        title="How do you shop?"
        subtitle="This shapes the signals and reports we send you."
      />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {ROLES_V2.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={`relative flex flex-col items-center justify-between rounded-2xl border bg-white p-6 pt-8 h-48 sm:h-56 text-center transition-all ${
                active
                  ? "border-primary shadow-lift"
                  : "border-hairline hover:border-primary/60"
              }`}
            >
              <span
                className={`absolute top-3 right-3 inline-flex h-5 w-5 items-center justify-center border rounded-md ${
                  active
                    ? "bg-primary border-primary text-white"
                    : "border-hairline bg-white"
                }`}
              >
                {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <div className="flex-1 flex items-center justify-center">
                <img src={ROLE_IMAGES[r]} alt="" className="h-20 w-20 object-contain" />
              </div>
              <span className="font-display text-base font-medium leading-tight">
                {ROLE_LABELS_V2[r]}
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
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
        {title}
      </h2>
      <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
    </div>
  );
}
