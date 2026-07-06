import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/cookies.md?raw";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — LuxTracker" },
      { name: "description", content: "How LuxTracker uses cookies and similar technologies, and how to manage your choices." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
