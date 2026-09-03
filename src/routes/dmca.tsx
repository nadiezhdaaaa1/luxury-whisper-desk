import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/dmca.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA Copyright Policy — PriceYou" },
      {
        name: "description",
        content:
          "How to report copyright infringement to PriceYou, file a counter-notice, and our repeat infringer policy.",
      },
      { property: "og:url", content: canonicalUrl("/dmca") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/dmca") }],
  }),
  component: () => <LegalPage content={content} lastUpdated="September 3, 2026" />,
});
