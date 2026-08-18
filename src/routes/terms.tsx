import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/terms.md?raw";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PriceYou" },
      {
        name: "description",
        content:
          "PriceYou Terms of Service — the agreement between you and NORELIX LIMITED (trading as PriceYou) for use of our website and app.",
      },
      { property: "og:title", content: "PriceYou Terms of Service" },
      {
        property: "og:description",
        content: "The agreement between you and PriceYou for use of our website and app.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
