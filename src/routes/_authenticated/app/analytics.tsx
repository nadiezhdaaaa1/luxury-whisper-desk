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
      title="Analytics / AI"
      description="Trends across the brands you watch and the pieces you own."
      feature="analytics"
    />
  );
}
