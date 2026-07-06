import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/terms.md?raw";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — LuxTracker" },
      { name: "description", content: "Terms of Service for LuxTracker by Zentaro Systems Ltd." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
