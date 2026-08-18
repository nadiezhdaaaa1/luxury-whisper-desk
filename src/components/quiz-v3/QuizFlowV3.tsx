// V3 quiz flow — independent onboarding. Steps:
// Intro → Categories → one Brand-picker screen per selected category (in fixed
// order watches → jewelry → bags) → Role.
// Global 10-brand cap across all categories. Segments (tier) inferred from picks.
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
import { useBrandsCatalog, type BrandRow } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import {
  CATEGORIES_V3,
  CATEGORY_LABELS_V3,
  EMPTY_ANSWERS_V3,
  ROLES_V3,
  ROLE_LABELS_V3,
  SEGMENT_LABELS_V3,
  brandCategoryLabelV3,
  clearDraftV3,
  brandDisplayNameV3,
  encodeBrandV3,
  type CategoryV3,
  type QuizAnswersV3,
  type RoleV3,
  type SegmentV3,
} from "@/lib/quiz-v3";

import roleCollectorAsset from "@/assets/role-collector-2.png.asset.json";
import roleResellerAsset from "@/assets/role-reseller-2.png.asset.json";
import roleBuyerAsset from "@/assets/role-buyer-2.png.asset.json";
import tabsWatchesAsset from "@/assets/tabs-watches.png.asset.json";
import tabsJewelryAsset from "@/assets/tabs-jewelry.png.asset.json";
import tabsBagsAsset from "@/assets/tabs-bags.png.asset.json";

type Props = {
  mode: "landing" | "in-app";
  initial?: QuizAnswersV3;
  onChange?: (a: QuizAnswersV3) => void;
  onComplete: (a: QuizAnswersV3) => void;
  submitLabel?: string;
};

const GLOBAL_BRAND_CAP = 10;

const CATEGORY_ORDER: CategoryV3[] = ["watches", "jewelry", "bags"];

const CATEGORY_ICONS: Record<CategoryV3, typeof Watch> = {
  watches: Watch,
  jewelry: Gem,
  bags: ShoppingBag,
};

const CATEGORY_IMAGES: Record<CategoryV3, string> = {
  watches: tabsWatchesAsset.url,
  jewelry: tabsJewelryAsset.url,
  bags: tabsBagsAsset.url,
};

const ROLE_IMAGES: Record<RoleV3, string> = {
  collector: roleCollectorAsset.url,
  reseller: roleResellerAsset.url,
  buyer: roleBuyerAsset.url,
};

const MARQUEE_BRANDS = [
  "Patek Philippe",
  "Rolex",
  "Tudor",
  "Audemars Piguet",
  "Omega",
  "Cartier",
  "Bulgari",
  "Van Cleef & Arpels",
  "Hermès",
  "Chanel",
  "Louis Vuitton",
  "Dior",
];

type Step =
  | { kind: "intro" }
  | { kind: "categories" }
  | { kind: "brands"; category: CategoryV3 }
  | { kind: "role" };

export function QuizFlowV3({ mode, initial, onChange, onComplete, submitLabel }: Props) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<QuizAnswersV3>(initial ?? EMPTY_ANSWERS_V3);
  const [stepIndex, setStepIndex] = useState(0);
  const [showZeroBrandsAlert, setShowZeroBrandsAlert] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const catalog = useBrandsCatalog();
  const catalogRows: BrandRow[] = catalog.data ?? [];

  useEffect(() => {
    track("quiz_v3_start", { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute the ordered step list based on current categories.
  const steps = useMemo<Step[]>(() => {
    const orderedCats = CATEGORY_ORDER.filter((c) => answers.categories.includes(c));
    return [
      { kind: "intro" },
      { kind: "categories" },
      ...orderedCats.map<Step>((c) => ({ kind: "brands", category: c })),
      { kind: "role" },
    ];
  }, [answers.categories]);

  // Clamp stepIndex if categories changed and shortened the list.
  useEffect(() => {
    if (stepIndex > steps.length - 1) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  const current = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    track("quiz_v3_step", { mode, step: current.kind });
  }, [current.kind, mode]);

  // Hide the zero-brands alert once the user picks any brand or leaves the step.
  useEffect(() => {
    if (answers.brands.length > 0) setShowZeroBrandsAlert(false);
  }, [answers.brands.length]);

  useEffect(() => {
    setShowZeroBrandsAlert(false);
  }, [stepIndex]);

  // Inferred segments (tier) from picks.
  const inferredSegments = useMemo<SegmentV3[]>(() => {
    if (answers.brands.length === 0) return [];
    const tiers = new Set<SegmentV3>();
    for (const encoded of answers.brands) {
      const i = encoded.lastIndexOf(" — ");
      const name = i === -1 ? encoded : encoded.slice(0, i);
      const catLabel = i === -1 ? null : encoded.slice(i + 3);
      const cat = catLabel
        ? (Object.keys(CATEGORY_LABELS_V3) as CategoryV3[]).find(
            (k) => CATEGORY_LABELS_V3[k] === catLabel,
          )
        : null;
      const row = catalogRows.find(
        (b) => b.name === name && (cat == null || b.category === cat),
      );
      if (row) tiers.add(row.tier as SegmentV3);
    }
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

  function update<K extends keyof QuizAnswersV3>(key: K, value: QuizAnswersV3[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const overCap = answers.brands.length > GLOBAL_BRAND_CAP;

  // Per-step validity (controls whether the primary CTA is enabled and
  // whether the CTA reads "Skip the category").
  const currentCatPicks = useMemo(() => {
    if (current.kind !== "brands") return 0;
    const label = CATEGORY_LABELS_V3[current.category];
    return answers.brands.filter((b) => brandCategoryLabelV3(b) === label).length;
  }, [current, answers.brands]);

  function primaryLabel(): string {
    if (current.kind === "intro") return "Let's go";
    if (current.kind === "role") return submitLabel ?? "Finish";
    if (current.kind === "brands" && currentCatPicks === 0) return "Skip the category";
    return "Continue";
  }

  function primaryDisabled(): boolean {
    if (current.kind === "categories") return answers.categories.length === 0;
    if (current.kind === "brands") return overCap;
    if (current.kind === "role") return answers.role === null;
    return false;
  }

  function next() {
    if (primaryDisabled()) return;

    const isLastCategory =
      current.kind === "brands" && steps[stepIndex + 1]?.kind === "role";
    if (
      isLastCategory &&
      currentCatPicks === 0 &&
      answers.brands.length === 0
    ) {
      setShowZeroBrandsAlert(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onComplete({ ...answers, segments: inferredSegments });
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 pt-8">
          <div className="flex items-center justify-start">
            <Logo className="text-[28px]" />
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-3xl pt-8 pb-8 sm:pt-14 sm:pb-12">
        <div className="min-h-[420px] px-4 sm:px-5">
          {current.kind === "intro" ? (
            <StepIntro />
          ) : current.kind === "categories" ? (
            <StepCategories
              value={answers.categories}
              onChange={(v) => {
                // If a category was removed, also drop its brand picks.
                const removed = answers.categories.filter((c) => !v.includes(c));
                let brands = answers.brands;
                if (removed.length > 0) {
                  const removedLabels = new Set(removed.map((c) => CATEGORY_LABELS_V3[c]));
                  brands = brands.filter((b) => {
                    const l = brandCategoryLabelV3(b);
                    return !(l && removedLabels.has(l));
                  });
                }
                setAnswers((a) => ({ ...a, categories: v, brands }));
              }}
            />
          ) : current.kind === "brands" ? (
            <StepBrandPicker
              category={current.category}
              brands={answers.brands}
              onBrandsChange={(v) => update("brands", v)}
              catalogRows={catalogRows}
              inferredSegments={inferredSegments}
              overCap={overCap}
            />
          ) : (
            <StepRole value={answers.role} onChange={(v) => update("role", v)} />
          )}

          {showZeroBrandsAlert && current.kind === "brands" ? (
            <div className="mt-6 rounded-2xl bg-primary text-white p-5 sm:p-6">
              <div className="font-display text-base font-medium leading-snug">
                Pick at least one brand from any category to add to your watchlist
              </div>
            </div>
          ) : null}

          <div className="mt-12 flex flex-col-reverse items-end sm:flex-row sm:items-center sm:justify-between gap-7 sm:gap-3">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="btn-tertiary self-start sm:self-auto"
            >
              Back to site
            </button>

            <div className="flex items-center gap-3">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="btn-secondary inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                disabled={primaryDisabled()}
                className={`min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed ${
                  primaryLabel() === "Skip the category" ? "btn-secondary" : "btn-primary"
                }`}
              >
                {primaryLabel()}
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
              Your progress won&apos;t be saved and you&apos;ll be taken back to the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-secondary mt-0">Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearDraftV3();
                navigate({ to: "/" });
              }}
              className="btn-primary"
            >
              Leave quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Intro ────────────────────────────────────────────────────────────────
function StepIntro() {
  const row = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  return (
    <div>
      <h2 className="font-display text-[32px] sm:text-[36px] font-medium tracking-tight leading-[1.15]">
        Let&apos;s build your personalized watchlist
      </h2>
      <p className="mt-3 text-base text-muted-foreground max-w-2xl">
        Two quick questions. Pick your categories and brands, tell us how you shop, and
        we&apos;ll set up a dashboard tuned to what you actually care about.
      </p>
      <div className="mt-14 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
          style={{ background: "linear-gradient(to right, var(--background), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
          style={{ background: "linear-gradient(to left, var(--background), transparent)" }}
        />
        <div className="flex gap-14 whitespace-nowrap py-2 marquee">
          {row.map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="text-lg sm:text-xl font-bold tracking-[0.02em] uppercase text-muted-foreground/70"
              style={{ fontFamily: '"Montserrat", sans-serif' }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────
function StepCategories({
  value,
  onChange,
}: {
  value: CategoryV3[];
  onChange: (v: CategoryV3[]) => void;
}) {
  function toggle(c: CategoryV3) {
    onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  }
  return (
    <div>
      <h2 className="font-display text-[28px] sm:text-[32px] font-medium tracking-tight leading-[1.2]">
        What categories are you interested in?
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        Pick which categories brands you want to follow?
      </p>

      <div className="mt-10">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
          Categories
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CATEGORIES_V3.map((c) => {
            const active = value.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={active}
                className={`group relative flex items-center rounded-2xl border pl-5 pr-2 h-20 overflow-hidden transition-colors ${
                  active
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-hairline text-foreground hover:border-primary/60"
                }`}
              >
                {active && (
                  <Check className="mr-2 h-5 w-5 shrink-0" strokeWidth={2.5} />
                )}
                <span className="font-display text-lg font-medium">
                  {CATEGORY_LABELS_V3[c]}
                </span>

                <img
                  src={CATEGORY_IMAGES[c]}
                  alt=""
                  aria-hidden
                  className="absolute bottom-0 right-0 h-20 w-auto object-contain object-right-bottom"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Brand picker (per category) ──────────────────────────────────────────
const POPULAR_COUNT = 6;

function StepBrandPicker({
  category,
  brands,
  onBrandsChange,
  catalogRows,
  inferredSegments,
  overCap,
}: {
  category: CategoryV3;
  brands: string[];
  onBrandsChange: (v: string[]) => void;
  catalogRows: BrandRow[];
  inferredSegments: SegmentV3[];
  overCap: boolean;
}) {
  const [query, setQuery] = useState("");
  const Icon = CATEGORY_ICONS[category];
  const catLabel = CATEGORY_LABELS_V3[category];
  const catLower = catLabel.toLowerCase();

  const inCategory = useMemo(
    () =>
      catalogRows
        .filter((b) => b.category === category)
        .map((b) => ({
          encoded: encodeBrandV3(b.name, category),
          name: b.name,
          tier: b.tier as SegmentV3,
        })),
    [catalogRows, category],
  );

  // Rank popular by tier (luxury first) then name — stable "MOST POPULAR" block.
  const popular = useMemo(() => {
    const tierRank: Record<SegmentV3, number> = {
      luxury_invest: 0,
      mid_market: 1,
      mass_market: 2,
    };
    return [...inCategory]
      .sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name))
      .slice(0, POPULAR_COUNT);
  }, [inCategory]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as typeof inCategory;
    return inCategory
      .filter((b) => b.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }, [inCategory, query]);

  function toggleBrand(encoded: string) {
    onBrandsChange(
      brands.includes(encoded)
        ? brands.filter((x) => x !== encoded)
        : [...brands, encoded],
    );
  }

  const pickedInCat = brands.filter((b) => brandCategoryLabelV3(b) === catLabel);

  const grouped = useMemo(() => {
    const g: Record<CategoryV3, string[]> = { watches: [], jewelry: [], bags: [] };
    for (const b of brands) {
      const lbl = brandCategoryLabelV3(b);
      const c = (Object.keys(CATEGORY_LABELS_V3) as CategoryV3[]).find(
        (k) => CATEGORY_LABELS_V3[k] === lbl,
      );
      if (c) g[c].push(b);
    }
    return g;
  }, [brands]);

  return (
    <div>
      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-white p-6 sm:p-8 pr-40">
        <h2 className="font-display text-[24px] sm:text-[28px] font-medium tracking-tight leading-[1.2]">
          Pick {catLower} brands to follow
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          Pick at least one to add to your watchlist
        </p>
        <img
          src={CATEGORY_IMAGES[category]}
          alt=""
          aria-hidden
          className="absolute bottom-0 right-0 h-full w-auto max-h-40 object-contain object-right-bottom"
        />
      </div>

      {/* Most popular */}
      <div className="mt-8">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
          Most popular
        </div>
        <div className="rounded-2xl border border-hairline p-4 overflow-y-auto max-h-96">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {popular.map((b) => (
              <BrandRowButton
                key={b.encoded}
                active={brands.includes(b.encoded)}
                icon={<Icon className="h-4 w-4" />}
                name={b.name}
                right={catLabel}
                onClick={() => toggleBrand(b.encoded)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4">
        <div className="relative h-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a specific brand"
            className="pl-10 shadow-none rounded-full h-12 bg-white border-hairline focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>
        {query.trim() ? (
          <div className="mt-2 rounded-2xl border border-hairline bg-white/80 p-2 max-h-72 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No matches for "{query.trim()}".
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchResults.map((b) => (
                  <BrandRowButton
                    key={b.encoded}
                    active={brands.includes(b.encoded)}
                    icon={<Icon className="h-4 w-4" />}
                    name={b.name}
                    right={catLabel}
                    onClick={() => toggleBrand(b.encoded)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Picked in this category */}
      {pickedInCat.length > 0 ? (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
            PICKED&nbsp;({pickedInCat.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {pickedInCat.map((b) => (
              <PickedChip
                key={b}
                label={brandDisplayNameV3(b)}
                icon={<Icon className="h-3 w-3" />}
                onRemove={() => toggleBrand(b)}
              />
            ))}
          </div>
          {inferredSegments.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Inferred tier:{" "}
              <span className="text-foreground font-medium">
                {inferredSegments.map((s) => SEGMENT_LABELS_V3[s]).join(" · ")}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Global cap alert */}
      {overCap ? (
        <div className="mt-6 rounded-2xl bg-primary text-white p-5 sm:p-6">
          <div className="font-display text-base font-medium leading-snug">
            You have over {GLOBAL_BRAND_CAP} brands in your watchlist across all
            categories — please remove {brands.length - GLOBAL_BRAND_CAP} to continue
          </div>
          <p className="mt-1 text-sm text-white/75">
            You'll be able to upgrade your plan and add more brands inside the app.
          </p>
          <div className="mt-5 space-y-4">
            {CATEGORY_ORDER.map((c) => {
              const list = grouped[c];
              if (list.length === 0) return null;
              const CIcon = CATEGORY_ICONS[c];
              return (
                <div key={c}>
                  <div className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
                    Picked {CATEGORY_LABELS_V3[c].toLowerCase()} brands ({list.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((b) => (
                      <PickedChip
                        key={b}
                        onDark
                        label={brandDisplayNameV3(b)}
                        icon={<CIcon className="h-3 w-3" />}
                        onRemove={() => onBrandsChange(brands.filter((x) => x !== b))}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrandRowButton({
  active,
  icon,
  name,
  right,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  name: string;
  right: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors bg-white ${
        active ? "border-primary" : "border-hairline hover:border-primary/60"
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border shrink-0 ${
          active ? "bg-primary border-primary text-white" : "border-hairline"
        }`}
      >
        {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </span>
      <span className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </span>
      <span className="truncate flex-1">{name}</span>
    </button>
  );
}

function PickedChip({
  label,
  icon,
  onRemove,
  onDark = false,
}: {
  label: string;
  icon: React.ReactNode;
  onRemove: () => void;
  onDark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1 h-7 text-xs ${
        onDark
          ? "bg-white/10 border border-white/15 text-white"
          : "bg-surface-2 border border-hairline text-foreground"
      }`}
    >
      <span className={onDark ? "text-white/70" : "text-muted-foreground"}>{icon}</span>
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
          onDark ? "hover:bg-white/15" : "hover:bg-hairline/70"
        }`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Role ─────────────────────────────────────────────────────────────────
function StepRole({
  value,
  onChange,
}: {
  value: RoleV3 | null;
  onChange: (v: RoleV3) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-[28px] sm:text-[32px] font-medium tracking-tight leading-[1.2]">
        How do you shop?
      </h2>
      <p className="mt-2 text-base text-muted-foreground">
        This shapes the signals and reports we send you.
      </p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES_V3.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              aria-pressed={active}
              className={`group relative flex items-center rounded-2xl border pl-5 pr-2 h-20 overflow-hidden transition-colors ${
                active
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-hairline text-foreground hover:border-primary/60"
              }`}
            >
              {active && (
                <Check className="mr-2 h-5 w-5 shrink-0" strokeWidth={2.5} />
              )}
              <span className="font-display text-base font-medium">
                {ROLE_LABELS_V3[r]}
              </span>

              <img
                src={ROLE_IMAGES[r]}
                alt=""
                aria-hidden
                className="absolute bottom-0 right-0 h-20 w-auto object-contain object-right-bottom"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
