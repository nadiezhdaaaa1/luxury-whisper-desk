import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/privacy.md?raw";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LuxTracker" },
      { name: "description", content: "How LuxTracker collects, uses, shares, and protects your personal information." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
