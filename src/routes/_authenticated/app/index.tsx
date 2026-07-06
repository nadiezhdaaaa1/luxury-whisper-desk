import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/app/")({
  component: () => (
    <EmptyState
      title="Nothing here yet"
      description="Your dashboard comes to life once you finish the quick setup. We'll add signals, watchlist, and portfolio widgets here."
    />
  ),
});
