import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/app/signals")({
  component: () => (
    <EmptyState
      title="No signals yet"
      description="Price-rise alerts and drop signals will land here."
    />
  ),
});
