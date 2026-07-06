import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: () => (
    <EmptyState
      title="No pieces yet"
      description="Add what you own to see live value and trends."
    />
  ),
});
