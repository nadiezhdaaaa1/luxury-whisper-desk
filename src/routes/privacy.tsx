import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/privacy.md?raw";
import { canonicalUrl } from "@/lib/site-url";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PriceYou" },
      {
        name: "description",
        content:
          "How PriceYou collects, uses, shares, and protects your personal information across our website and app.",
      },
      { property: "og:title", content: "PriceYou Privacy Policy" },
      {
        property: "og:description",
        content: "How we collect, use, share, and protect your personal information.",
      },
      { property: "og:url", content: canonicalUrl("/privacy") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/privacy") }],
  }),
  component: () => <LegalPage content={content} />,
});
