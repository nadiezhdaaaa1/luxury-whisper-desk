import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { BrandMarquee } from "@/components/landing/BrandMarquee";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Categories } from "@/components/landing/Categories";
import { Audience } from "@/components/landing/Audience";
import { Comparison } from "@/components/landing/Comparison";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ, qs as faqItems } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { Reveal } from "@/components/landing/Reveal";

import { SITE_URL } from "@/lib/site-url";
import { PlanFlowProvider } from "@/lib/onboarding/PlanFlowContext";
import { RegistrationModal } from "@/components/auth/RegistrationModal";
import type { usePlanFlow } from "@/lib/onboarding/usePlanFlow";
import { isPlanIntent } from "@/lib/onboarding/planIntent";

// Funnel arrival: `?plan=` only. Our plan ids are single tokens, so there is
// no separate billing-cycle param. An unknown value is ignored silently.
// Repeated params arrive as an array and unknown params must survive
// untouched (attribution), so this never throws: it coerces and passes the
// rest through.
const searchSchema = z.object({ plan: z.string().optional() }).passthrough();

function validateLandingSearch(s: Record<string, unknown>) {
  const raw = s?.["plan"];
  const plan = Array.isArray(raw) ? raw[0] : raw;
  const parsed = searchSchema.safeParse({
    ...s,
    plan: typeof plan === "string" ? plan : undefined,
  });
  return (parsed.success ? parsed.data : { ...s, plan: undefined }) as Record<string, unknown> & {
    plan?: string;
  };
}

export const Route = createFileRoute("/")({
  component: Index,
  validateSearch: validateLandingSearch,
  head: () => ({
    meta: [
      { title: "PriceYou — Price Tracker for Watches, Jewelry & Bags" },
      {
        name: "description",
        content:
          "PriceYou tracks prices across watches, jewelry and bags, mid-market to luxury. Follow your favorite brands and get alerts the moment prices move.",
      },
      { property: "og:title", content: "PriceYou — Price Tracker for Watches, Jewelry & Bags" },
      {
        property: "og:description",
        content:
          "Follow your favorite brands, mid-market to luxury, and get alerts the moment prices move.",
      },
      { name: "twitter:title", content: "PriceYou — Price Tracker for Watches, Jewelry & Bags" },
      {
        name: "twitter:description",
        content:
          "Follow your favorite brands, mid-market to luxury, and get alerts the moment prices move.",
      },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PriceYou",
          url: `${SITE_URL}/`,
          description:
            "Track prices across watches, jewelry and bags, mid-market to luxury. Follow your favorite brands and get alerts when values change.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PriceYou",
          legalName: "KERIVO STUDIO LIMITED",
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/favicon.svg`,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
});

function Index() {
  // Exactly ONE plan flow — and therefore one registration modal — for the
  // whole landing page. Pricing cards read it through the context.
  return <PlanFlowProvider source="landing_card">{(flow) => <IndexBody flow={flow} />}</PlanFlowProvider>;
}

function IndexBody({ flow }: { flow: ReturnType<typeof usePlanFlow> }) {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const rawPlan = search.plan;
  // One-shot: the effect must not re-fire on re-render or after the param is
  // stripped from the URL.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!rawPlan) return;
    handled.current = true;
    // Strip ONLY `plan` — utm_*, gclid and friends must survive.
    void navigate({
      to: "/",
      search: (prev: Record<string, unknown>) => {
        const { plan: _drop, ...rest } = prev ?? {};
        return rest;
      },
      replace: true,
    });
    if (!isPlanIntent(rawPlan)) return;
    void flow.selectPlan({ plan: rawPlan, source: "funnel_param" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPlan]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Reveal>
          <BrandMarquee />
        </Reveal>
        <Reveal>
          <ProblemSection />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <Categories />
        </Reveal>
        <Reveal>
          <Audience />
        </Reveal>
        <Reveal>
          <Comparison />
        </Reveal>
        <Reveal>
          <Pricing />
        </Reveal>
        <Reveal>
          <FAQ />
        </Reveal>
        <Reveal>
          <FinalCTA />
        </Reveal>
      </main>
      <Footer />

      <RegistrationModal
        open={flow.modalOpen}
        onOpenChange={flow.setModalOpen}
        googleRedirectTo={flow.googleRedirectTo}
        onAuthed={flow.onAuthed}
        source={flow.modalSource}
        plan={flow.pendingPlan}
      />
    </div>
  );
}
