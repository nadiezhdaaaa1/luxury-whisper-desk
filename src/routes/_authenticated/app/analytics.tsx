// Placeholder page for the in-development Analytics / AI section. It is
// reachable from the sidebar so we can measure whether people want it.
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [{ title: "Analytics / AI — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  useEffect(() => {
    track("coming_soon_view", { feature: "analytics" });
  }, []);

  return (
    <div>
      <PageHeader
        title="Analytics / AI"
        subtitle="Trends across the brands you watch and the pieces you own."
      />
      <div className="rounded-lg border border-hairline bg-card p-8 shadow-[var(--shadow-card)]">
        <EmptyState
          title="Still in development"
          description="This page will show how prices move across your brands and your portfolio over time, with short AI summaries of what changed and why. It is not available yet."
        />
      </div>
    </div>
  );
}
