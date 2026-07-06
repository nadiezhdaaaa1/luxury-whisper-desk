import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import content from "@/content/legal/refunds.md?raw";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — LuxTracker" },
      { name: "description", content: "How LuxTracker handles cancellations and refunds for subscriptions." },
    ],
  }),
  component: () => <LegalPage content={content} />,
});
