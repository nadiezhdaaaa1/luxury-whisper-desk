// V3 aha reveal. Two hosts, one component, explicit mode — it never infers:
//  - mode="public"  (`/quiz`): no account yet. Purely a preview: everything is
//    visible, no email gate and no account creation. "Start your collection"
//    advances the /quiz flow to the plan step, which owns registration.
//  - mode="in-app"  (`/app/quiz`): already authenticated and the answers are
//    already saved. The right-hand column reads the access flags instead.
//
// The portfolio-valuation preview was removed: that feature is not in launch
// scope, so the screen must not promise it. It now shows example price alerts
// for the picked brands instead.
import { useEffect, useMemo, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { QuizHeader } from "@/components/quiz-v3/QuizHeader";
import { RevealAccessPanel } from "@/components/quiz-v3/RevealAccessPanel";
import { ExampleAlertCard } from "@/components/quiz-v3/ExampleAlertCard";
import { getExampleAlerts } from "@/lib/aha-signals.functions";

import { useBrandsCatalog, parseEncodedBrand } from "@/lib/catalog";
import { resolveBrandSlug } from "@/lib/signals";
import type { QuizAnswersV3 } from "@/lib/quiz-v3";

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

  const alertsQuery = useQuery({
    queryKey: ["aha-example-alerts", brandSlugs],
    queryFn: () => getExampleAlerts({ data: { brandSlugs } }),
    enabled: brandSlugs.length > 0,
    staleTime: 1000 * 60 * 5,
  });
  const alerts = alertsQuery.data ?? [];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <QuizHeader />

      <div className="flex-1 mx-auto w-full max-w-3xl pt-5 pb-8 sm:pt-9 sm:pb-16">
        <div className="min-h-[420px] px-4 sm:px-5">
          <div>
            <span className="eyebrow">YOUR PREVIEW</span>
            <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight leading-[1.2]">
              Your brands have been busy
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              {isPublic
                ? "Recent activity on the brands you picked. Create your account and you'll hear it as it happens."
                : "Recent activity on the brands you picked. Your answers are saved."}
            </p>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <LabelPill>Example alerts</LabelPill>
              {coverageLabel ? (
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {coverageLabel}
                </span>
              ) : null}
            </div>

            {/* No skeleton while loading — the reveal must not wait. Zero rows
                hides the panel entirely rather than showing an empty box. */}
            {alerts.length > 0 ? (
              <div className="mt-4 flex w-full flex-col gap-2 rounded-[24px] bg-hero-tray p-3">
                {alerts.map((a) => (
                  <ExampleAlertCard key={a.id} alert={a} />
                ))}
              </div>
            ) : null}
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
              <button
                type="button"
                onClick={onStart}
                className="btn-primary min-w-[140px] gap-2 pl-6 pr-5"
              >
                Start your collection →
              </button>
            ) : null}
          </div>
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
