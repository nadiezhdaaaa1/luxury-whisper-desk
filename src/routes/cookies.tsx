import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/cookies.md?raw";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — PriceYou" },
      {
        name: "description",
        content:
          "How PriceYou uses cookies and similar technologies, what categories we use, and how to manage your choices from the cookie preferences panel.",
      },
      { property: "og:title", content: "PriceYou Cookie Policy" },
      {
        property: "og:description",
        content: "How we use cookies and how to manage your preferences.",
      },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
