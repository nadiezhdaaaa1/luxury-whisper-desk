import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  component: () => (
    <div>
      <PageHeader
        eyebrow="Watchlist"
        title="Pieces you're eyeing"
        subtitle="Track targets and get pinged when prices move."
      />
      <EmptyState
        title="Your watchlist is empty"
        description="Track pieces you're eyeing and set target prices."
      />
    </div>
  ),
});
