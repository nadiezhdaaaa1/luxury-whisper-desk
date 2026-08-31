import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/billing.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & Billing Terms — PriceYou" },
      {
        name: "description",
        content: "PriceYou plan pricing, billing periods, automatic renewal, and cancellation terms.",
      },
      { property: "og:url", content: canonicalUrl("/billing") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/billing") }],
  }),
  component: () => <LegalPage content={content} lastUpdated="August 27, 2026" />,
});
