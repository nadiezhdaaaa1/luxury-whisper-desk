import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/refunds.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — PriceYou" },
      {
        name: "description",
        content: "How PriceYou handles cancellations and refunds for subscriptions.",
      },
      { property: "og:url", content: canonicalUrl("/refunds") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/refunds") }],
  }),
  component: () => <LegalPage content={content} lastUpdated="September 3, 2026" />,
});
