import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/privacy.md?raw";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PriceYou" },
      { name: "description", content: "How PriceYou collects, uses, shares, and protects your personal information across our website and app." },
      { property: "og:title", content: "PriceYou Privacy Policy" },
      { property: "og:description", content: "How we collect, use, share, and protect your personal information." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
