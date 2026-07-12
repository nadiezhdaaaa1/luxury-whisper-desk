import { createFileRoute } from "@tanstack/react-router";
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

const SITE_URL = "https://luxury-whisper-desk.lovable.app";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PriceYou — Track luxury watch, jewelry & bag prices" },
      { name: "description", content: "PriceYou tracks retail prices for luxury watches, jewelry, and bags. Follow your favorite brands, watch specific pieces, and get alerts the moment prices move." },
      { property: "og:title", content: "PriceYou — Track luxury watch, jewelry & bag prices" },
      { property: "og:description", content: "Follow your favorite luxury brands and get alerts the moment prices change." },
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
            "Track prices for luxury watches, jewelry, and bags. Follow your favorite brands and get alerts when values change.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PriceYou",
          legalName: "NORELIX LIMITED",
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Reveal><BrandMarquee /></Reveal>
        <Reveal><ProblemSection /></Reveal>
        <Reveal><HowItWorks /></Reveal>
        <Reveal><Features /></Reveal>
        <Reveal><Categories /></Reveal>
        <Reveal><Audience /></Reveal>
        <Reveal><Comparison /></Reveal>
        <Reveal><Pricing /></Reveal>
        <Reveal><FAQ /></Reveal>
        <Reveal><FinalCTA /></Reveal>
      </main>
      <Footer />
    </div>
  );
}
