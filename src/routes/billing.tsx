import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/billing.md?raw";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & Billing Terms — LuxTracker" },
      { name: "description", content: "LuxTracker plans, trials, automatic renewal, and cancellation terms." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
