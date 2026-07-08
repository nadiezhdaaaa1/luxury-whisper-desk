import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: () => (
    <div>
      <PageHeader
        title="What you own, at live value"
        subtitle="Add pieces to track their price movements over time."
      />
      <EmptyState
        title="No pieces yet"
        description="Add what you own to see live value and trends."
      />
    </div>
  ),
});
