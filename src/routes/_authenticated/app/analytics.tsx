// Placeholder page for the in-development Analytics / AI section. It is
// reachable from the sidebar so we can measure whether people want it.
import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/app/ComingSoonPage";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [{ title: "Analytics / AI — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <ComingSoonPage
      description="This page will show how prices move across your brands and your portfolio over time, with short AI summaries of what changed and why. It is not available yet."
      feature="analytics"
    />
  );
}
