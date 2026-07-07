import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/app/")({
  component: () => (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Your collection at a glance"
        subtitle="Signals, watchlist, and portfolio widgets will land here."
      />
      <EmptyState
        title="Nothing here yet"
        description="Your dashboard comes to life once you finish the quick setup."
      />
    </div>
  ),
});
