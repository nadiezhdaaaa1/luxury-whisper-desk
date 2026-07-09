import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/disclaimer.md?raw";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Financial / Valuation Disclaimer — Price.you" },
      { name: "description", content: "Price.you valuations and signals are estimates and informational only — not investment advice." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
