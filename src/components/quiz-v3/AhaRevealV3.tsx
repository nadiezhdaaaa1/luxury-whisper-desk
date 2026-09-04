// V3 aha reveal. Two hosts, one component, explicit mode — it never infers:
//  - mode="public"  (`/quiz`): no account yet. Purely a preview: everything is
//    visible, no email gate and no account creation. "Start your collection"
//    advances the /quiz flow to the plan step, which owns registration.
//  - mode="in-app"  (`/app/quiz`): already authenticated and the answers are
//    already saved. The right-hand column reads the access flags instead.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { track } from "@/lib/analytics";
import { QuizHeader } from "@/components/quiz-v3/QuizHeader";
import { RevealAccessPanel } from "@/components/quiz-v3/RevealAccessPanel";

import { useBrandsCatalog, parseEncodedBrand } from "@/lib/catalog";
import { resolveBrandSlug } from "@/lib/signals";
import {
  CATEGORY_LABELS_V3,
  formatCompactUSDV3,
  indicativeRangeV3,
  personalizationLineV3,
  type CategoryV3,
  type QuizAnswersV3,
} from "@/lib/quiz-v3";

type Props = {
  answers: QuizAnswersV3;
  mode: "public" | "in-app";
  onBack?: () => void;
  /** Public mode only: advance to the plan step. */
  onStart?: () => void;
};

export function AhaRevealV3({ answers, mode, onBack, onStart }: Props) {
  const isPublic = mode === "public";
  const brandsCatalog = useBrandsCatalog();

  useEffect(() => {
    track("aha_reveal_v3", { brands: answers.brands.length });
  }, [answers.brands.length]);

  const resolveTier = useMemo(() => {
    const list = brandsCatalog.data ?? [];
    return (name: string, cat: CategoryV3 | null) => {
      const row = list.find((b) => b.name === name && (cat === null || b.category === cat));
      return (row?.tier as "luxury_invest" | "mid_market") ?? null;
    };
  }, [brandsCatalog.data]);

  // Resolve the encoded quiz brands ("Name — CategoryLabel") to catalog slugs.
  // Brands with no catalog match contribute nothing.
  const brandSlugs = useMemo(() => {
    const list = brandsCatalog.data;
    const out: string[] = [];
    for (const encoded of answers.brands) {
      const { name, category } = parseEncodedBrand(encoded);
      if (!category) continue;
      const slug = resolveBrandSlug(list, name, category);
      if (slug && !out.includes(slug)) out.push(slug);
    }
    return out;
  }, [answers.brands, brandsCatalog.data]);

  // Coverage, not signal counts: `public.signals` is readable only by
  // `authenticated`, and this screen is always pre-auth. The `brands` catalog
  // IS anon-readable, so we report how many picked brands we actually track.
  const coverageLabel = useMemo(() => {
    if (!brandsCatalog.data) return null;
    const total = answers.brands.length;
    const tracked = brandSlugs.length;
    if (total === 0) return null;
    if (tracked >= total) return `All ${total} covered`;
    return `${tracked} of ${total} covered`;
  }, [brandsCatalog.data, answers.brands.length, brandSlugs.length]);

  const range = useMemo(
    () => indicativeRangeV3(answers.brands, answers.segments, answers.categories, resolveTier),
    [answers.brands, answers.segments, answers.categories, resolveTier],
  );
  const personal = useMemo(
    () => personalizationLineV3(answers.brands, answers.segments, answers.categories),
    [answers.brands, answers.segments, answers.categories],
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <QuizHeader />

      <div className="flex-1 mx-auto w-full max-w-3xl pt-5 pb-8 sm:pt-9 sm:pb-12">
        <div className="min-h-[420px] px-4 sm:px-5">
          <div>
            <span className="eyebrow">YOUR PREVIEW</span>
            <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
              Here's what your dashboard will track
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              {isPublic
                ? "Based on your picks. Create your account to save it."
                : "Based on your picks. Your answers are saved."}
            </p>
          </div>

          <div className="mt-8">
            <HeroValueCard
              range={range}
              personal={personal}
              brandsCount={answers.brands.length}
              brands={answers.brands}
              coverageLabel={coverageLabel}
            />
          </div>

          {!isPublic ? (
            <div className="mt-8">
              <RevealAccessPanel />
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between gap-3">
            <div>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="btn-secondary inline-flex items-center gap-1.5 min-w-[120px] pl-4 pr-5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : null}
            </div>
            {isPublic && onStart ? (
              <button type="button" onClick={onStart} className="btn-primary min-w-[140px] gap-2 pl-6 pr-5">
                Start your collection →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, durationMs = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setVal(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

function HeroValueCard({
  range,
  personal,
  brandsCount,
  brands,
  coverageLabel,
}: {
  range: ReturnType<typeof indicativeRangeV3>;
  personal: string;
  brandsCount: number;
  brands: string[];
  coverageLabel: string | null;
}) {
  const lowAnim = useCountUp(range.low);
  const highAnim = useCountUp(range.high);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const catEntries = Object.entries(range.perCategory) as [
    keyof typeof CATEGORY_LABELS_V3,
    { low: number; high: number },
  ][];

  return (
    // Two nested layers — same treatment as /login.
    <div className="rounded-[24px] bg-[#edf4f9] p-3 animate-fade-in">
      <div className="flex flex-col gap-6 rounded-[16px] border border-white bg-white/80 p-[25px] shadow-[0_1px_2px_rgba(29,20,13,0.04),0_8px_24px_rgba(29,20,13,0.06)]">
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-[320px_minmax(0,1fr)] md:gap-x-8">
          <div>
            <LabelPill>Indicative collection value</LabelPill>
            <div className="flex items-baseline gap-2 pt-5 font-display text-[40px] font-semibold leading-[1.2] tracking-[-1.2px] text-foreground">
              <span>{formatCompactUSDV3(lowAnim)}</span>
              <span className="font-normal text-foreground/40">–</span>
              <span>{formatCompactUSDV3(highAnim)}</span>
            </div>
            <div className="pt-3">
              <div
                className="h-1.5 w-full rounded-full"
                style={{ background: "linear-gradient(90deg, #fa2e00 0%, #2225ca 100%)" }}
              />
              <div className="flex justify-between pt-2 text-[11px] uppercase leading-4 tracking-[1.1px] text-muted-foreground">
                <span>Starter</span>
                <span>Mature</span>
              </div>
            </div>
            <p className="pt-6 text-base leading-[26px] text-foreground/80">
              A rough estimate of what a collection in your brands is worth at typical entry prices.
            </p>
            <p className="pt-3 text-sm leading-5 text-muted-foreground">{personal}</p>
          </div>

          <div className="relative md:border-l md:border-[#cfdbe2] md:pl-8">
            <LabelPill>How we got this</LabelPill>
            <ul className="pt-2 text-sm leading-5 text-foreground">
              {[
                `Based on the ${brandsCount} brand${brandsCount === 1 ? "" : "s"} you picked`,
                "Using typical starting prices for each",
                "Tier inferred automatically from your picks",
              ].map((line) => (
                <li key={line} className="flex h-10 items-center gap-2">
                  <span className="w-2 shrink-0 text-foreground/50">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {catEntries.length > 0 && (
              <div className="mt-5 rounded-[12px] bg-[#ebf1f4] px-4 py-3">
                <LabelPill className="bg-white/70">By category</LabelPill>
                <div className="pt-1">
                  {catEntries.map(([cat, v]) => (
                    <div key={cat} className="flex h-[26px] items-center justify-between pt-1.5">
                      <span className="text-sm leading-5 text-foreground/75">
                        {CATEGORY_LABELS_V3[cat]}
                      </span>
                      <span className="font-display text-sm font-normal leading-5 tabular-nums text-foreground">
                        {formatCompactUSDV3(v.low)}
                        <span className="mx-1 text-muted-foreground">–</span>
                        {formatCompactUSDV3(v.high)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="px-2 pt-4 text-[11px] leading-[17.875px] text-muted-foreground">
              Estimate based on typical entry prices — not investment advice.
            </p>
          </div>
        </div>

        {/* Selected brands — collapsed disclosure, folded into this card. */}
        <div className="border-t border-[#cfdbe2] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <LabelPill>Selected brands ({brands.length})</LabelPill>
              <span className="text-[11px] text-muted-foreground">
                We&apos;ll track price alerts for selected brands
              </span>
              {coverageLabel ? (
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {coverageLabel}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setBrandsOpen((v) => !v)}
              aria-expanded={brandsOpen}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.6px] text-foreground"
            >
              {brandsOpen ? "Hide" : "Show"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${brandsOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>

          {brandsOpen ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {brands.map((b) => {
                const sep = " — ";
                const i = b.lastIndexOf(sep);
                const name = i === -1 ? b : b.slice(0, i);
                const cat = i === -1 ? null : b.slice(i + sep.length);
                return (
                  <span
                    key={b}
                    className="inline-flex items-baseline rounded-full bg-[#ebf1f4] px-3 py-1 text-xs"
                  >
                    <span>{name}</span>
                    {cat ? (
                      <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                        {cat}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Section label pill — Manrope Bold 11px, uppercase, on the inset fill. */
function LabelPill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#ebf1f4] px-3 py-1.5 font-display text-[11px] font-bold uppercase leading-none tracking-[0.6px] text-[#0e0e0e] ${className}`}
    >
      {children}
    </span>
  );
}

