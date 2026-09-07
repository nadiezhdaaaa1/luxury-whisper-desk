// Placeholder page for the in-development Digests section. It is reachable
// from the sidebar so we can measure whether people want it.
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/app/digests")({
  head: () => ({
    meta: [{ title: "Digests — PriceYou" }, { name: "robots", content: "noindex" }],
  }),
  component: DigestsPage,
});

function DigestsPage() {
  useEffect(() => {
    track("coming_soon_view", { feature: "digests" });
  }, []);

  return (
    <div>
      <PageHeader
        title="Digests"
        subtitle="A weekly email round-up of the brands you watch."
      />
      <div className="rounded-lg border border-hairline bg-card p-8 shadow-[var(--shadow-card)]">
        <EmptyState
          title="Still in development"
          description="This will be a weekly email summarising price moves, discounts and drops on the brands you watch, so you can catch up in one go. It is not available yet."
        />
      </div>
    </div>
  );
}
