import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/app/watchlist")({
  component: () => (
    <EmptyState
      title="Your watchlist is empty"
      description="Track pieces you're eyeing and set target prices."
    />
  ),
});
