import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/disclaimer.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Signal & Estimate Disclaimer — PriceYou" },
      {
        name: "description",
        content:
          "PriceYou Signals, price and discount information, and any estimates are for informational purposes only and are not investment or financial advice.",
      },
      { property: "og:title", content: "PriceYou Signal & Estimate Disclaimer" },
      {
        property: "og:description",
        content:
          "PriceYou Signals, price and discount information, and any estimates are for informational purposes only and are not investment or financial advice.",
      },
      { property: "og:url", content: canonicalUrl("/disclaimer") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/disclaimer") }],
  }),
  component: () => <LegalPage content={content} lastUpdated="September 3, 2026" />,
});
