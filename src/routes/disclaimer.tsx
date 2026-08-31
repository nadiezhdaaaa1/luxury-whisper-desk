import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/disclaimer.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Financial / Valuation Disclaimer — PriceYou" },
      {
        name: "description",
        content:
          "PriceYou valuations, price alerts, and market data are estimates for informational purposes only and do not constitute investment or financial advice.",
      },
      { property: "og:title", content: "PriceYou Valuation Disclaimer" },
      {
        property: "og:description",
        content:
          "Our valuations and price alerts are estimates for informational purposes only, not investment advice.",
      },
      { property: "og:url", content: canonicalUrl("/disclaimer") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/disclaimer") }],
  }),
  component: () => <LegalPage content={content} lastUpdated="August 27, 2026" />,
});
